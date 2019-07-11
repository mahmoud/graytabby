import {TabGroup, TabSummary} from "../@types/graytabby";
import {getURL} from "./ext";

export function castTab(nativeTab: any): TabSummary | null {
  if (nativeTab.windowId == undefined
    || nativeTab.id == undefined
    || nativeTab.url == undefined
    || nativeTab.title == undefined) {
    return null;
  }
  return {
    pinned: nativeTab.pinned,
    id: nativeTab.id,
    windowId: nativeTab.windowId,
    url: nativeTab.url,
    title: nativeTab.title
  }
}

export function appURL(): string {
  return getURL('app.html');
}

export function groupsFromLocalStorage(): TabGroup[] {
  let bytes = localStorage.getItem('groups');
  if (bytes == null) return [];
  let groups: TabGroup[] = JSON.parse(bytes);
  // This filter is really just in case cleanup didn't happen properly,
  // or if malformed tabs got in to storage.
  return groups.filter(g => g.date && g.tabs.length > 0)
}

export function groupsToLocalStorage(groups: TabGroup[]) {
  localStorage.setItem('groups', JSON.stringify(groups));
}

export function getDomain(url: string): string {
  return new URL(url).hostname
}

export function faviconLocation(url: string): string {
  return 'https://www.google.com/s2/favicons?domain=' + getDomain(url);
}
