import type { ToolExecutor } from "./composio.js";
import type { PullRequestSummary } from "./types.js";
import { withRetry } from "./retry.js";

const PAGE_SIZE = 100;

interface ListPullRequestItem {
  readonly number: number;
}

interface ListPullRequestsData {
  readonly pull_requests?: readonly ListPullRequestItem[];
  readonly items?: readonly ListPullRequestItem[];
}

interface PullRequestDetailData {
  readonly number: number;
  readonly title: string;
  readonly html_url?: string;
  readonly url?: string;
  readonly changed_files?: number;
  readonly additions?: number;
  readonly deletions?: number;
  readonly labels?: readonly { readonly name?: string }[];
  readonly requested_reviewers?: readonly unknown[];
  readonly requested_teams?: readonly unknown[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asListData(value: unknown): ListPullRequestsData {
  if (!isRecord(value)) return {};
  return value as unknown as ListPullRequestsData;
}

function asDetailData(value: unknown): PullRequestDetailData {
  if (!isRecord(value)) throw new Error("GitHub PR detail response was not an object");
  return value as unknown as PullRequestDetailData;
}

function listFromData(data: ListPullRequestsData): readonly ListPullRequestItem[] {
  return data.pull_requests ?? data.items ?? [];
}

export class GitHubClient {
  constructor(
    private readonly executor: ToolExecutor,
    private readonly userId: string,
    private readonly owner: string,
    private readonly repo: string,
    private readonly errorsPath: string,
  ) {}

  async fetchOpenPullRequests(): Promise<PullRequestSummary[]> {
    const summaries: PullRequestSummary[] = [];
    let page = 1;

    while (true) {
      const pageItems = await withRetry(
        `github list open pull requests page ${page}`,
        async () => {
          const result = await this.executor.execute("GITHUB_LIST_PULL_REQUESTS", {
            userId: this.userId,
            arguments: {
              owner: this.owner,
              repo: this.repo,
              state: "open",
              per_page: PAGE_SIZE,
              page,
            },
          });
          return listFromData(asListData(result.data));
        },
        this.errorsPath,
      );

      if (pageItems === null || pageItems.length === 0) break;

      for (const item of pageItems) {
        const detail = await this.fetchPullRequestDetail(item.number);
        if (detail !== null) summaries.push(detail);
      }

      if (pageItems.length < PAGE_SIZE) break;
      page += 1;
    }

    return summaries;
  }

  private async fetchPullRequestDetail(pullNumber: number): Promise<PullRequestSummary | null> {
    return withRetry(
      `github get pull request ${pullNumber}`,
      async () => {
        const result = await this.executor.execute("GITHUB_GET_A_PULL_REQUEST", {
          userId: this.userId,
          arguments: {
            owner: this.owner,
            repo: this.repo,
            pull_number: pullNumber,
          },
        });
        const detail = asDetailData(result.data);
        const labels = (detail.labels ?? [])
          .map((label) => label.name)
          .filter((name): name is string => typeof name === "string" && name.length > 0);
        const reviewerCount =
          (detail.requested_reviewers?.length ?? 0) + (detail.requested_teams?.length ?? 0);

        return {
          number: detail.number,
          title: detail.title,
          url: detail.html_url ?? detail.url ?? "",
          changedFiles: detail.changed_files ?? 0,
          additions: detail.additions ?? 0,
          deletions: detail.deletions ?? 0,
          labels,
          reviewerCount,
        };
      },
      this.errorsPath,
    );
  }
}
