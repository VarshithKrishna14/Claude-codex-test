import type { Composio } from "@composio/core";
import type { PullRequest } from "./types.js";
import { ComposioCallError, withRetry } from "./retry.js";

interface ListPRItem {
  readonly number: number;
  readonly title: string;
  readonly html_url: string;
  readonly labels?: ReadonlyArray<{ readonly name: string }>;
  readonly requested_reviewers?: ReadonlyArray<unknown>;
  readonly requested_teams?: ReadonlyArray<unknown>;
}

interface ListPRData {
  readonly pull_requests: ReadonlyArray<ListPRItem>;
}

interface DetailedPRData {
  readonly number: number;
  readonly title: string;
  readonly html_url: string;
  readonly additions: number;
  readonly deletions: number;
  readonly changed_files: number;
  readonly labels?: ReadonlyArray<{ readonly name: string }>;
  readonly requested_reviewers?: ReadonlyArray<unknown>;
  readonly requested_teams?: ReadonlyArray<unknown>;
}

const LIST_PER_PAGE = 100;

export interface GitHubClient {
  fetchOpenPullRequests(): Promise<PullRequest[]>;
}

export function createGitHubClient(params: {
  composio: Composio;
  userId: string;
  owner: string;
  repo: string;
  errorLogPath: string;
}): GitHubClient {
  const { composio, userId, owner, repo, errorLogPath } = params;

  async function listOpenPRsPage(page: number): Promise<ReadonlyArray<ListPRItem>> {
    const res = await composio.tools.execute("GITHUB_LIST_PULL_REQUESTS", {
      userId,
      arguments: { owner, repo, state: "open", per_page: LIST_PER_PAGE, page },
    });
    if (!res.successful) {
      throw new ComposioCallError(
        `GITHUB_LIST_PULL_REQUESTS failed: ${res.error ?? "unknown error"}`,
        res,
      );
    }
    const data = res.data as unknown as ListPRData;
    return data.pull_requests ?? [];
  }

  async function getPRDetail(pullNumber: number): Promise<DetailedPRData> {
    const res = await composio.tools.execute("GITHUB_GET_A_PULL_REQUEST", {
      userId,
      arguments: { owner, repo, pull_number: pullNumber },
    });
    if (!res.successful) {
      throw new ComposioCallError(
        `GITHUB_GET_A_PULL_REQUEST(#${pullNumber}) failed: ${res.error ?? "unknown error"}`,
        res,
      );
    }
    return res.data as unknown as DetailedPRData;
  }

  return {
    async fetchOpenPullRequests(): Promise<PullRequest[]> {
      const out: PullRequest[] = [];
      let page = 1;
      // Paginate list endpoint
      // Retry the whole page fetch; if a page terminally fails, log and skip the page.
      while (true) {
        const items = await withRetry(
          `list open PRs page=${page}`,
          () => listOpenPRsPage(page),
          errorLogPath,
        );
        if (items === null) break; // hard fail on this page; stop iteration
        if (items.length === 0) break;

        for (const item of items) {
          const detail = await withRetry(
            `get PR #${item.number}`,
            () => getPRDetail(item.number),
            errorLogPath,
          );
          if (detail === null) continue; // skip this PR per spec
          const reviewerCount =
            (detail.requested_reviewers?.length ?? 0) + (detail.requested_teams?.length ?? 0);
          out.push({
            number: detail.number,
            title: detail.title,
            url: detail.html_url,
            additions: detail.additions,
            deletions: detail.deletions,
            changedFiles: detail.changed_files,
            labelCount: detail.labels?.length ?? 0,
            reviewerCount,
          });
        }

        if (items.length < LIST_PER_PAGE) break;
        page++;
      }
      return out;
    },
  };
}
