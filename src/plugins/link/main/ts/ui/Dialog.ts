/**
 * Copyright (c) Tiny Technologies, Inc. All rights reserved.
 * Licensed under the LGPL or a commercial license.
 * For LGPL see License.txt in the project root for license information.
 * For commercial licenses see https://www.tiny.cloud/
 */

import { DialogInstanceApi } from '@ephox/bridge/lib/main/ts/ephox/bridge/components/dialog/Dialog';
import { HTMLAnchorElement } from '@ephox/dom-globals';
import { Arr, Future, Option, Options } from '@ephox/katamari';
import { Editor } from 'tinymce/core/api/Editor';

import Settings from '../api/Settings';
import { ListOptions } from '../core/ListOptions';
import Utils from '../core/Utils';
import { DialogChanges } from './DialogChanges';
import { DialogConfirms } from './DialogConfirms';
import { DialogInfo } from './DialogInfo';
import { LinkDialogData, LinkDialogInfo } from './DialogTypes';
import { Types } from '@ephox/bridge';

const handleSubmit = (editor, info: LinkDialogInfo, text: Option<string>, assumeExternalTargets: boolean) => (api: DialogInstanceApi<LinkDialogData>) => {
  const data: LinkDialogData = api.getData();

  const resultData = {
    href: data.url.value,
    text: data.text ? data.text : text.getOr(undefined),
    target: data.target ? data.target : undefined,
    rel: data.rel ? data.rel : undefined,
    class: data.classz ? data.classz : undefined,
    title: data.title ? data.title : undefined,
  };

  const attachState = {
    href: data.url.value,
    attach: data.url.meta !== undefined && data.url.meta.attach ? data.url.meta.attach : () => {}
  };

  const insertLink = Utils.link(editor, attachState);
  const removeLink = Utils.unlink(editor);

  const url = data.url.value;

  if (!url) {
    removeLink();
    // Temporary fix. TODO: TINY-2811
    api.close();
    return;
  }

  if (text.is(data.text) || (info.optNode.isNone() && !data.text)) {
    delete resultData.text;
  }

  DialogConfirms.preprocess(editor, assumeExternalTargets, resultData).get((pData) => {
    insertLink(pData);
  });

  api.close();
};

const collectData = (editor): Future<LinkDialogInfo> => {
  const settings = editor.settings;
  const anchorNode: HTMLAnchorElement = Utils.getAnchorElement(editor);
  return DialogInfo.collect(editor, settings, anchorNode);
};

const getInitialData = (settings: LinkDialogInfo): LinkDialogData => ({
  url: {
    value: settings.anchor.url.getOr(''),
    meta: {
      attach: () => { },
      text: settings.anchor.url.fold(
        () => '',
        () => settings.anchor.text.getOr('')
      ),
      original: {
        value: settings.anchor.url.getOr(''),
      }
    }
  },
  text: settings.anchor.text.getOr(''),
  title: settings.anchor.title.getOr(''),
  anchor: settings.anchor.url.getOr(''),
  link: settings.anchor.url.getOr(''),
  rel: settings.anchor.rel.getOr(''),
  target: settings.anchor.target.getOr(''),
  classz: settings.anchor.linkClass.getOr('')
});

const makeDialog = (settings: LinkDialogInfo, onSubmit): Types.Dialog.DialogApi<LinkDialogData> => {

  const urlInput: Types.Dialog.BodyComponentApi[] = [
    {
      name: 'url',
      type: 'urlinput',
      filetype: 'file',
      label: 'URL'
    }
  ];

  const displayText = settings.anchor.text.map<Types.Dialog.BodyComponentApi>(() => (
    {
      name: 'text',
      type: 'input',
      label: 'Text to display'
    }
  )).toArray();

  const titleText: Types.Dialog.BodyComponentApi[] = settings.flags.titleEnabled ? [
    {
      name: 'title',
      type: 'input',
      label: 'Title'
    }
  ] : [];

  const initialData = getInitialData(settings);
  const dialogDelta = DialogChanges.init(initialData, settings);
  const catalogs = settings.catalogs;

  const body: Types.Dialog.PanelApi = {
    type: 'panel',
    items: Arr.flatten([
      urlInput,
      displayText,
      titleText,
      Options.cat<Types.Dialog.BodyComponentApi>([
        catalogs.anchor.map(ListOptions.createUi('anchor', 'Anchors')),
        catalogs.rels.map(ListOptions.createUi('rel', 'Rel')),
        catalogs.targets.map(ListOptions.createUi('target', 'Open link in...')),
        catalogs.link.map(ListOptions.createUi('link', 'Link list')),
        catalogs.classes.map(ListOptions.createUi('classz', 'Class'))
      ])
    ])
  };
  return {
    title: 'Insert/Edit Link',
    size: 'normal',
    body,
    buttons: [
      {
        type: 'cancel',
        name: 'cancel',
        text: 'Cancel'
      },
      {
        type: 'submit',
        name: 'save',
        text: 'Save',
        primary: true
      }
    ],
    initialData,
    onChange: (api: DialogInstanceApi<LinkDialogData>, {name}) => {
      dialogDelta.onChange(api.getData, { name }).each((newData) => {
        api.setData(newData);
      });
    },
    onSubmit
  };
};

const open = function (editor: Editor) {
  const data = collectData(editor);
  data.map((info) => {
    const onSubmit = handleSubmit(editor, info, info.anchor.text, Settings.assumeExternalTargets(editor.settings));
    return makeDialog(info, onSubmit);
  }).get((spec) => {
    editor.windowManager.open(spec);
  });
};

export default {
  open
};