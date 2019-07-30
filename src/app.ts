/**
 * Importing this module (in an HTML page or otherwise) will initialize GrayTabby
 * data structures and will attach the GrayTabby app to the HTML element with id = 'app'.
 */

import 'bootstrap';
import './scss/app.scss';
import nanoid from 'nanoid';
const Bind = require('bind.js');  // TODO: Find a way to import this.

import { optionsStore, tabsStore } from './storage';
import { KeyedTabSummary, TabGroup, TabSummary } from '../@types/graytabby';
import { faviconLocation, makeElement, snip } from './utils';
import { moreTabs, pageLoad } from './brokers';
import { browser } from 'webextension-polyfill-ts';


/**
 * The main entry point for GrayTabby.
 */
async function grayTabby() {
  let tabGroups = await tabsStore.get();
  let options = await optionsStore.get();
  console.log('Loaded options:', options);

  // example: https://jsbin.com/yoqaku/1/edit?html,js,output
  // TODO: tabLimit gets saved as a string here, even though the Options type
  // has it as a number. This is benign at the moment, because of how comparisons
  // work in JS between numbers and strings, e.g. 2 < "3" but 2 > "1".
  options = Bind(options, {
    'tabLimit': 'input[name=tabLimit]',
    'toggles': 'input[name=toggles]'
  });

  let saveOptionsButton = <HTMLButtonElement>document.querySelector('#saveOptions');
  saveOptionsButton.onclick = () => {
    optionsStore.put({
      ...options,
      // Extra spread required here because bind.js uses a homebrew array class which
      // does not serialize as an array.
      toggles: [...options.toggles]
    });
  };

  let infoNode = <HTMLParagraphElement>document.querySelector('#info');
  let groupsNode = <HTMLDivElement>document.querySelector('#groups')
  let optionsLimitNode = <HTMLInputElement>document.querySelector('#optionsLimit');

  // From https://stackoverflow.com/questions/469357/html-text-input-allow-only-numeric-input
  // HTML5 validators have poor support at the moment.
  optionsLimitNode.onkeydown = e => {
    return (
      e.ctrlKey || e.altKey
      || (47 < e.keyCode && e.keyCode < 58 && e.shiftKey == false)
      || (95 < e.keyCode && e.keyCode < 106)
      || (e.keyCode == 8) || (e.keyCode == 9)
      || (e.keyCode > 34 && e.keyCode < 40)
      || (e.keyCode == 46)
    )
  }

  function totalTabs(): number {
    return tabGroups.reduce(
      (acc, cur) => acc + cur.tabs.length, 0
    )
  }

  function removeGroup(group: TabGroup): Element {
    let found = document.querySelector(`[id='${group.key}']`);
    groupsNode.removeChild(found);
    snip(tabGroups, tg => tg.key === group.key);
    return found;
  }

  function updateInfo(): void {
    infoNode.innerText = 'Total tabs: ' + totalTabs().toString();
  }


  function renderLinkRow(group: TabGroup, tab: KeyedTabSummary): HTMLDivElement {
    let row = <HTMLDivElement>makeElement('div');
    row.appendChild(renderFavicon(tab.url));
    let a = <HTMLAnchorElement>row.appendChild(
      makeElement('a', { href: tab.url }, tab.title));
    a.onclick = event => {
      event.preventDefault();
      browser.tabs.create({ url: tab.url, active: false });
      row.parentElement.removeChild(row);
      snip(group.tabs, t => t.key === tab.key);
      if (group.tabs.length == 0) removeGroup(group);
      tabsStore.put(tabGroups);
      updateInfo();
    };
    return row;
  }

  function renderGroup(group: TabGroup): HTMLDivElement {
    let div = <HTMLDivElement>makeElement('div', { 'id': group.key });
    div.appendChild(makeElement('span', {}, new Date(group.date * 1000).toLocaleString()));
    let ul = div.appendChild(makeElement('ul'));
    for (let tab of group.tabs) {
      let li = ul.appendChild(makeElement('li'));
      li.appendChild(renderLinkRow(group, tab));
    }
    return div;
  }

  function renderFavicon(url: string): HTMLImageElement {
    let loc = faviconLocation(url);
    return <HTMLImageElement>makeElement('img', {
      src: loc,
      width: '16',
      height: '16'
    });
  }

  function prependInsideContainer(parent: Element, child: Element): Element {
    if (parent.firstChild == null) parent.appendChild(child);
    else parent.insertBefore(child, parent.firstChild);
    return child;
  }

  if (tabGroups) {
    for (let group of tabGroups) groupsNode.appendChild(renderGroup(group));
  }

  function ingestTabs(tabSummaries: TabSummary[]) {
    let groupKey = nanoid(9);
    let counter = 0;
    let group: TabGroup = {
      tabs: tabSummaries.map(ts => {
        return { ...ts, key: groupKey + counter++ }
      }),
      key: groupKey,
      date: Math.round(new Date().getTime() / 1000)
    };
    tabGroups.unshift(group);
    prependInsideContainer(groupsNode, renderGroup(group));

    while (totalTabs() > options.tabLimit) {
      removeGroup(tabGroups[tabGroups.length - 1]);
    }

    tabsStore.put(tabGroups);
    updateInfo();
  }

  moreTabs.sub(ingestTabs);
  updateInfo();

  // Debugging...
  function double() {
    for (let group of [...tabGroups]) {
      ingestTabs(group.tabs);
    }
  }

  function more(limit: number) {
    let counter = 0;
    for (let group of [...tabGroups]) {
      ingestTabs(group.tabs);
      if ((counter += group.tabs.length) >= limit) break;
    }
  }

  async function reset() {
    await optionsStore.clear();
    await tabsStore.clear();
    window.location.reload();
  }

  // @ts-ignore
  window.double = double;
  // @ts-ignore
  window.more = more;
  // @ts-ignore
  window.reset = reset;
}

grayTabby().then(() => {
  pageLoad.pub(null);
  console.log('loaded graytabby')
});
