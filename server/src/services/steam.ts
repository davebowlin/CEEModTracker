import axios from "axios";

interface SteamWorkshopResponse {
  response: {
    publishedfiledetails: Array<{
      result: number;
      publishedfileid: string;
      title: string;
      description: string;
      creator: string;
      time_updated: number;
      views: number;
      subscriptions: number;
      favorited: number;
      file_size: number;
    }>;
  };
}

interface SteamQueryResponse {
  response: {
    total: number;
    publishedfiledetails: Array<{
      publishedfileid: string;
    }>;
  };
}

export async function fetchWorkshopDetails(ids: string[]) {
  const body = new URLSearchParams();
  body.append("itemcount", String(ids.length));
  ids.forEach((id, index) => {
    body.append(`publishedfileids[${index}]`, id);
  });

  const response = await axios.post<SteamWorkshopResponse>(
    "https://api.steampowered.com/ISteamRemoteStorage/GetPublishedFileDetails/v1/",
    body,
    {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      timeout: 20_000
    }
  );

  return response.data.response.publishedfiledetails.filter((item) => item.result === 1);
}

export async function discoverAllWorkshopIds(params: {
  apiKey: string;
  appId: number;
  pageSize: number;
  maxPages: number;
}): Promise<string[]> {
  const ids = new Set<string>();
  let page = 1;
  let total = Number.MAX_SAFE_INTEGER;

  while (page <= params.maxPages && ids.size < total) {
    const response = await axios.get<SteamQueryResponse>(
      "https://api.steampowered.com/IPublishedFileService/QueryFiles/v1/",
      {
        params: {
          key: params.apiKey,
          appid: params.appId,
          query_type: 1,
          page,
          numperpage: params.pageSize
        },
        timeout: 20_000
      }
    );

    total = response.data.response.total ?? total;
    const batch = response.data.response.publishedfiledetails ?? [];
    if (batch.length === 0) break;

    for (const item of batch) {
      if (item.publishedfileid) {
        ids.add(item.publishedfileid);
      }
    }
    page += 1;
  }

  return [...ids];
}
