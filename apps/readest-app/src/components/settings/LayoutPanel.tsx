import React, { useEffect, useState } from 'react';
import { MdOutlineAutoMode, MdOutlineScreenRotation } from 'react-icons/md';
import { MdOutlineTextRotationNone, MdTextRotateVertical } from 'react-icons/md';
import { IoPhoneLandscapeOutline, IoPhonePortraitOutline } from 'react-icons/io5';
import { TbTextDirectionRtl } from 'react-icons/tb';

import { useEnv } from '@/context/EnvContext';
import { useReaderStore } from '@/store/readerStore';
import { useBookDataStore } from '@/store/bookDataStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useTranslation } from '@/hooks/useTranslation';
import { useResetViewSettings } from '@/hooks/useResetSettings';
import { isCJKEnv } from '@/utils/misc';
import { getStyles } from '@/utils/style';
import { getMaxInlineSize } from '@/utils/config';
import { lockScreenOrientation } from '@/utils/bridge';
import { saveViewSettings } from '@/helpers/settings';
import { getBookDirFromWritingMode, getBookLangCode } from '@/utils/book';
import { MIGHT_BE_RTL_LANGS } from '@/services/constants';
import { SettingsPanelPanelProp } from './SettingsDialog';
import { useScopedLabel } from './SettingsScopeContext';
import { useScopeTags } from './ScopeTag';
import {
  BoxedList,
  SettingLabel,
  SettingsRow,
  SettingsSelect,
  SettingsSwitchRow,
} from './primitives';
import NumberInput from './NumberInput';
import { Toggle } from '../primitives/toggle';
import { useEditedViewSettings } from '@/hooks/useEditedViewSettings';

const LayoutPanel: React.FC<SettingsPanelPanelProp> = ({ bookKey, onRegisterReset }) => {
  const _ = useTranslation();
  const scopeTag = useScopeTags(bookKey);
  const { envConfig, appService } = useEnv();
  const { settings } = useSettingsStore();
  const { getView, getViewSettings, getGridInsets } = useReaderStore();
  const { setViewSettings, recreateViewer } = useReaderStore();
  const { getBookData } = useBookDataStore();
  const viewSettings = getViewSettings(bookKey) || settings.globalViewSettings;
  const { edited, book } = useEditedViewSettings(bookKey);
  const scopedLabel = useScopedLabel();

  const view = getView(bookKey);
  const bookData = getBookData(bookKey);
  const gridInsets = getGridInsets(bookKey) || { top: 0, bottom: 0, left: 0, right: 0 };

  const [paragraphMargin, setParagraphMargin] = useState(edited.paragraphMargin);
  const [lineHeight, setLineHeight] = useState(edited.lineHeight);
  const [wordSpacing, setWordSpacing] = useState(edited.wordSpacing);
  const [letterSpacing, setLetterSpacing] = useState(edited.letterSpacing);
  const [textIndent, setTextIndent] = useState(edited.textIndent!);
  const [fullJustification, setFullJustification] = useState(edited.fullJustification);
  const [hyphenation, setHyphenation] = useState(edited.hyphenation);
  const [marginTopPx, setMarginTopPx] = useState(edited.marginPx || viewSettings.marginTopPx);
  const [marginBottomPx, setMarginBottomPx] = useState(edited.marginBottomPx);
  const [marginLeftPx, setMarginLeftPx] = useState(edited.marginLeftPx);
  const [marginRightPx, setMarginRightPx] = useState(edited.marginRightPx);
  const [compactMarginTopPx, setCompactMarginTopPx] = useState(
    edited.compactMarginPx || viewSettings.compactMarginTopPx,
  );
  const [compactMarginBottomPx, setCompactMarginBottomPx] = useState(edited.compactMarginBottomPx);
  const [gapPercent, setGapPercent] = useState(edited.gapPercent);
  const [compactMarginLeftPx, setCompactMarginLeftPx] = useState(edited.compactMarginLeftPx);
  const [compactMarginRightPx, setCompactMarginRightPx] = useState(edited.compactMarginRightPx);
  const [maxColumnCount, setMaxColumnCount] = useState(edited.maxColumnCount);
  const [maxInlineSize, setMaxInlineSize] = useState(edited.maxInlineSize);
  const [maxBlockSize, setMaxBlockSize] = useState(edited.maxBlockSize);
  const [writingMode, setWritingMode] = useState(book.writingMode);
  const [overrideLayout, setOverrideLayout] = useState(edited.overrideLayout);
  const [useBookLayout, setUseBookLayout] = useState(edited.useBookLayout);
  const [doubleBorder, setDoubleBorder] = useState(edited.doubleBorder);
  const [borderColor, setBorderColor] = useState(edited.borderColor);
  const [showHeader, setShowHeader] = useState(edited.showHeader);
  const [showFooter, setShowFooter] = useState(edited.showFooter);
  const [showRemainingTime, setShowRemainingTime] = useState(edited.showRemainingTime);
  const [showRemainingPages, setShowRemainingPages] = useState(edited.showRemainingPages);
  const [showProgressInfo, setShowProgressInfo] = useState(edited.showProgressInfo);
  const [showStickyProgressBar, setShowStickyProgressBar] = useState(edited.showStickyProgressBar);
  const [showCurrentTime, setShowCurrentTime] = useState(edited.showCurrentTime);
  const [use24HourClock, setUse24HourClock] = useState(edited.use24HourClock);
  const [showCurrentBatteryStatus, setShowCurrentBatteryStatus] = useState(
    edited.showCurrentBatteryStatus,
  );
  const [showBatteryPercentage, setShowBatteryPercentage] = useState(edited.showBatteryPercentage);
  const [progressStyle, setProgressStyle] = useState(edited.progressStyle);
  const [referencePageCount, setReferencePageCount] = useState(book.referencePageCount);
  const [screenOrientation, setScreenOrientation] = useState(edited.screenOrientation);

  const resetToDefaults = useResetViewSettings();

  const handleReset = () => {
    resetToDefaults({
      paragraphMargin: setParagraphMargin,
      lineHeight: setLineHeight,
      wordSpacing: setWordSpacing,
      letterSpacing: setLetterSpacing,
      textIndent: setTextIndent,
      fullJustification: setFullJustification,
      hyphenation: setHyphenation,
      marginTopPx: setMarginTopPx,
      marginBottomPx: setMarginBottomPx,
      marginLeftPx: setMarginLeftPx,
      marginRightPx: setMarginRightPx,
      compactMarginTopPx: setCompactMarginTopPx,
      compactMarginBottomPx: setCompactMarginBottomPx,
      compactMarginLeftPx: setCompactMarginLeftPx,
      compactMarginRightPx: setCompactMarginRightPx,
      gapPercent: setGapPercent,
      maxColumnCount: setMaxColumnCount,
      maxInlineSize: setMaxInlineSize,
      maxBlockSize: setMaxBlockSize,
      overrideLayout: setOverrideLayout,
      useBookLayout: setUseBookLayout,
      doubleBorder: setDoubleBorder,
      borderColor: setBorderColor,
      showHeader: setShowHeader,
      showFooter: setShowFooter,
      showRemainingTime: setShowRemainingTime,
      showRemainingPages: setShowRemainingPages,
      showProgressInfo: setShowProgressInfo,
      showStickyProgressBar: setShowStickyProgressBar,
      showCurrentTime: setShowCurrentTime,
      use24HourClock: setUse24HourClock,
      showCurrentBatteryStatus: setShowCurrentBatteryStatus,
      showBatteryPercentage: setShowBatteryPercentage,
    });
  };

  useEffect(() => {
    onRegisterReset(handleReset);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    saveViewSettings(envConfig, bookKey, 'paragraphMargin', paragraphMargin);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paragraphMargin]);

  useEffect(() => {
    saveViewSettings(envConfig, bookKey, 'lineHeight', lineHeight);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lineHeight]);

  useEffect(() => {
    saveViewSettings(envConfig, bookKey, 'wordSpacing', wordSpacing);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wordSpacing]);

  useEffect(() => {
    saveViewSettings(envConfig, bookKey, 'letterSpacing', letterSpacing);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [letterSpacing]);

  useEffect(() => {
    saveViewSettings(envConfig, bookKey, 'textIndent', textIndent);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [textIndent]);

  useEffect(() => {
    saveViewSettings(envConfig, bookKey, 'fullJustification', fullJustification);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullJustification]);

  useEffect(() => {
    saveViewSettings(envConfig, bookKey, 'hyphenation', hyphenation);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hyphenation]);

  useEffect(() => {
    if (marginTopPx === edited.marginTopPx) return;
    if (edited.marginPx !== undefined) {
      saveViewSettings(envConfig, bookKey, 'marginPx', undefined, false, false);
    }
    saveViewSettings(envConfig, bookKey, 'marginTopPx', marginTopPx, false, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marginTopPx]);

  useEffect(() => {
    if (marginBottomPx === edited.marginBottomPx) return;
    if (edited.marginPx !== undefined) {
      saveViewSettings(envConfig, bookKey, 'marginPx', undefined, false, false);
    }
    saveViewSettings(envConfig, bookKey, 'marginBottomPx', marginBottomPx, false, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marginBottomPx]);

  useEffect(() => {
    if (marginRightPx === edited.marginRightPx) return;
    if (edited.marginPx !== undefined) {
      saveViewSettings(envConfig, bookKey, 'marginPx', undefined, false, false);
    }
    saveViewSettings(envConfig, bookKey, 'marginRightPx', marginRightPx, false, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marginRightPx]);

  useEffect(() => {
    if (marginLeftPx === edited.marginLeftPx) return;
    if (edited.marginPx !== undefined) {
      saveViewSettings(envConfig, bookKey, 'marginPx', undefined, false, false);
    }
    saveViewSettings(envConfig, bookKey, 'marginLeftPx', marginLeftPx, false, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marginLeftPx]);

  useEffect(() => {
    if (compactMarginTopPx === edited.compactMarginTopPx) return;
    if (edited.compactMarginPx !== undefined) {
      saveViewSettings(envConfig, bookKey, 'compactMarginPx', undefined, false, false);
    }
    saveViewSettings(envConfig, bookKey, 'compactMarginTopPx', compactMarginTopPx, false, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compactMarginTopPx]);

  useEffect(() => {
    if (compactMarginBottomPx === edited.compactMarginBottomPx) return;
    if (edited.compactMarginPx !== undefined) {
      saveViewSettings(envConfig, bookKey, 'compactMarginPx', undefined, false, false);
    }
    saveViewSettings(
      envConfig,
      bookKey,
      'compactMarginBottomPx',
      compactMarginBottomPx,
      false,
      false,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compactMarginBottomPx]);

  useEffect(() => {
    if (compactMarginRightPx === edited.compactMarginRightPx) return;
    if (edited.compactMarginPx !== undefined) {
      saveViewSettings(envConfig, bookKey, 'compactMarginPx', undefined, false, false);
    }
    saveViewSettings(
      envConfig,
      bookKey,
      'compactMarginRightPx',
      compactMarginRightPx,
      false,
      false,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compactMarginRightPx]);

  useEffect(() => {
    if (compactMarginLeftPx === edited.compactMarginLeftPx) return;
    if (edited.compactMarginPx !== undefined) {
      saveViewSettings(envConfig, bookKey, 'compactMarginPx', undefined, false, false);
    }
    saveViewSettings(envConfig, bookKey, 'compactMarginLeftPx', compactMarginLeftPx, false, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compactMarginLeftPx]);

  useEffect(() => {
    if (gapPercent === edited.gapPercent) return;
    saveViewSettings(envConfig, bookKey, 'gapPercent', gapPercent, false, false);
    view?.renderer.setAttribute('gap', `${gapPercent}%`);
    if (viewSettings.scrolled) {
      view?.renderer.setAttribute('flow', 'scrolled');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gapPercent]);

  useEffect(() => {
    if (maxColumnCount === edited.maxColumnCount) return;
    saveViewSettings(envConfig, bookKey, 'maxColumnCount', maxColumnCount, false, false);
    const newViewSettings = getViewSettings(bookKey)!;
    view?.renderer.setAttribute('max-column-count', maxColumnCount);
    view?.renderer.setAttribute('max-inline-size', `${getMaxInlineSize(newViewSettings)}px`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxColumnCount]);

  useEffect(() => {
    if (maxInlineSize === edited.maxInlineSize) return;
    saveViewSettings(envConfig, bookKey, 'maxInlineSize', maxInlineSize, false, false);
    const newViewSettings = getViewSettings(bookKey)!;
    view?.renderer.setAttribute('max-inline-size', `${getMaxInlineSize(newViewSettings)}px`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxInlineSize]);

  useEffect(() => {
    if (maxBlockSize === edited.maxBlockSize) return;
    saveViewSettings(envConfig, bookKey, 'maxBlockSize', maxBlockSize, false, false);
    view?.renderer.setAttribute('max-block-size', `${maxBlockSize}px`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxBlockSize]);

  useEffect(() => {
    if (writingMode === book.writingMode) return;
    // global settings are not supported for writing mode
    const prevWritingMode = viewSettings.writingMode;
    if (writingMode.includes('vertical')) {
      viewSettings.vertical = true;
    } else {
      viewSettings.vertical = false;
    }
    saveViewSettings(envConfig, bookKey, 'writingMode', writingMode, true).then(() => {
      if (view) {
        const newViewSettings = getViewSettings(bookKey)!;
        view.renderer.setStyles?.(getStyles(newViewSettings));
        view.book.dir = getBookDirFromWritingMode(writingMode);
      }
      if (
        prevWritingMode !== writingMode &&
        (['horizontal-rl', 'vertical-rl'].includes(writingMode) ||
          ['horizontal-rl', 'vertical-rl'].includes(prevWritingMode))
      ) {
        recreateViewer(envConfig, bookKey);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [writingMode]);

  useEffect(() => {
    if (overrideLayout === edited.overrideLayout) return;
    saveViewSettings(envConfig, bookKey, 'overrideLayout', overrideLayout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overrideLayout]);

  useEffect(() => {
    if (useBookLayout === edited.useBookLayout) return;
    saveViewSettings(envConfig, bookKey, 'useBookLayout', useBookLayout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useBookLayout]);

  useEffect(() => {
    if (doubleBorder === edited.doubleBorder) return;
    saveViewSettings(envConfig, bookKey, 'doubleBorder', doubleBorder, false, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doubleBorder]);

  useEffect(() => {
    saveViewSettings(envConfig, bookKey, 'borderColor', borderColor, false, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [borderColor]);

  useEffect(() => {
    saveViewSettings(envConfig, bookKey, 'showRemainingTime', showRemainingTime, false, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showRemainingTime]);

  useEffect(() => {
    saveViewSettings(envConfig, bookKey, 'showRemainingPages', showRemainingPages, false, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showRemainingPages]);

  useEffect(() => {
    saveViewSettings(envConfig, bookKey, 'showProgressInfo', showProgressInfo, false, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showProgressInfo]);

  useEffect(() => {
    saveViewSettings(
      envConfig,
      bookKey,
      'showStickyProgressBar',
      showStickyProgressBar,
      false,
      false,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showStickyProgressBar]);

  useEffect(() => {
    saveViewSettings(envConfig, bookKey, 'showCurrentTime', showCurrentTime, false, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCurrentTime]);

  useEffect(() => {
    saveViewSettings(envConfig, bookKey, 'use24HourClock', use24HourClock, false, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [use24HourClock]);

  useEffect(() => {
    saveViewSettings(
      envConfig,
      bookKey,
      'showCurrentBatteryStatus',
      showCurrentBatteryStatus,
      false,
      false,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCurrentBatteryStatus]);

  useEffect(() => {
    saveViewSettings(
      envConfig,
      bookKey,
      'showBatteryPercentage',
      showBatteryPercentage,
      false,
      false,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showBatteryPercentage]);

  useEffect(() => {
    saveViewSettings(envConfig, bookKey, 'progressStyle', progressStyle, false, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progressStyle]);

  useEffect(() => {
    saveViewSettings(envConfig, bookKey, 'referencePageCount', referencePageCount, true, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [referencePageCount]);

  useEffect(() => {
    if (showHeader === edited.showHeader) return;
    if (showHeader && !viewSettings.vertical) {
      const minMarginTop = Math.max(0, Math.round((44 - gridInsets.top) / 4) * 4);
      viewSettings.marginTopPx = Math.max(viewSettings.marginTopPx, minMarginTop);
      setMarginTopPx(viewSettings.marginTopPx);
      setViewSettings(bookKey, viewSettings);
    }
    saveViewSettings(envConfig, bookKey, 'showHeader', showHeader, false, false);
    // Margin and gap settings will be applied in FoliateViewer
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showHeader]);

  useEffect(() => {
    if (showFooter === edited.showFooter) return;
    if (showFooter && !viewSettings.vertical) {
      const minMarginBottom = Math.max(0, Math.round((44 - gridInsets.bottom) / 4) * 4);
      viewSettings.marginBottomPx = Math.max(viewSettings.marginBottomPx, minMarginBottom);
      setMarginBottomPx(viewSettings.marginBottomPx);
      setViewSettings(bookKey, viewSettings);
    }
    saveViewSettings(envConfig, bookKey, 'showFooter', showFooter, false, false);
    // Margin and gap settings will be applied in FoliateViewer
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showFooter]);

  useEffect(() => {
    saveViewSettings(envConfig, bookKey, 'screenOrientation', screenOrientation, false, false);
    if (appService?.isMobileApp) {
      lockScreenOrientation({ orientation: screenOrientation });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screenOrientation]);

  const langCode = getBookLangCode(bookData?.bookDoc?.metadata?.language);
  const mightBeRTLBook = MIGHT_BE_RTL_LANGS.includes(langCode) || isCJKEnv();
  const isVertical = viewSettings.vertical || writingMode.includes('vertical');

  return (
    <div className='my-4 w-full space-y-6'>
      <div
        data-setting-id='settings.layout.overrideBookLayout'
        className='flex items-center justify-between px-4'
      >
        <SettingLabel>
          {scopedLabel(_('Override Book Layout'), 'overrideLayout', setOverrideLayout)}
        </SettingLabel>
        <Toggle checked={overrideLayout} onChange={() => setOverrideLayout(!overrideLayout)} />
      </div>
      {mightBeRTLBook && (
        <div
          data-setting-id='settings.layout.writingMode'
          className='flex items-center justify-between px-4'
        >
          <SettingLabel>{scopeTag.alwaysBook(_('Writing Mode'))}</SettingLabel>
          <div className='flex gap-4'>
            <button
              title={_('Default')}
              className={`btn btn-ghost btn-circle btn-sm ${writingMode === 'auto' ? 'btn-active bg-base-300' : ''}`}
              disabled={!bookKey}
              onClick={() => setWritingMode('auto')}
            >
              <MdOutlineAutoMode />
            </button>

            <button
              title={_('Horizontal Direction')}
              className={`btn btn-ghost btn-circle btn-sm ${writingMode === 'horizontal-tb' ? 'btn-active bg-base-300' : ''}`}
              disabled={!bookKey}
              onClick={() => setWritingMode('horizontal-tb')}
            >
              <MdOutlineTextRotationNone />
            </button>

            <button
              title={_('Vertical Direction')}
              className={`btn btn-ghost btn-circle btn-sm ${writingMode === 'vertical-rl' ? 'btn-active bg-base-300' : ''}`}
              disabled={!bookKey}
              onClick={() => setWritingMode('vertical-rl')}
            >
              <MdTextRotateVertical />
            </button>

            <button
              title={_('RTL Direction')}
              className={`btn btn-ghost btn-circle btn-sm ${writingMode === 'horizontal-rl' ? 'btn-active bg-base-300' : ''}`}
              disabled={!bookKey}
              onClick={() => setWritingMode('horizontal-rl')}
            >
              <TbTextDirectionRtl />
            </button>
          </div>
        </div>
      )}

      {viewSettings.vertical && (
        <BoxedList title={_('Border Frame')} data-setting-id='settings.layout.borderFrame'>
          <SettingsSwitchRow
            label={scopedLabel(_('Double Border'), 'doubleBorder', setDoubleBorder)}
            checked={doubleBorder}
            onChange={() => setDoubleBorder(!doubleBorder)}
          />
          <SettingsRow label={scopedLabel(_('Border Color'), 'borderColor', setBorderColor)}>
            <div className='flex gap-4'>
              <button
                className={`btn btn-circle btn-sm bg-red-300 hover:bg-red-500 ${borderColor === 'red' ? 'btn-active !bg-red-500' : ''}`}
                onClick={() => setBorderColor('red')}
              ></button>
              <button
                className={`btn btn-circle btn-sm bg-black/50 hover:bg-black ${borderColor === 'black' ? 'btn-active !bg-black' : ''}`}
                onClick={() => setBorderColor('black')}
              ></button>
            </div>
          </SettingsRow>
        </BoxedList>
      )}

      <BoxedList title={_('Paragraph')}>
        <SettingsSwitchRow
          label={scopedLabel(_('Use Book Layout'), 'useBookLayout', setUseBookLayout)}
          checked={useBookLayout}
          onChange={() => setUseBookLayout(!useBookLayout)}
          data-setting-id='settings.layout.useBookLayout'
        />
        <NumberInput
          label={scopedLabel(_('Paragraph Margin'), 'paragraphMargin', setParagraphMargin)}
          value={paragraphMargin}
          onChange={setParagraphMargin}
          disabled={useBookLayout}
          min={0}
          max={4}
          step={0.1}
          data-setting-id='settings.layout.paragraphMargin'
        />
        <NumberInput
          label={scopedLabel(_('Line Spacing'), 'lineHeight', setLineHeight)}
          value={lineHeight}
          onChange={setLineHeight}
          disabled={useBookLayout}
          min={1.0}
          max={3.0}
          step={0.1}
          data-setting-id='settings.layout.lineSpacing'
        />
        {langCode !== 'zh' && (
          <NumberInput
            label={scopedLabel(_('Word Spacing'), 'wordSpacing', setWordSpacing)}
            value={wordSpacing}
            onChange={setWordSpacing}
            disabled={useBookLayout}
            min={-4}
            max={8}
            step={0.5}
            data-setting-id='settings.layout.wordSpacing'
          />
        )}
        <NumberInput
          label={scopedLabel(_('Letter Spacing'), 'letterSpacing', setLetterSpacing)}
          value={letterSpacing}
          onChange={setLetterSpacing}
          disabled={useBookLayout}
          min={-2}
          max={4}
          step={0.5}
          data-setting-id='settings.layout.letterSpacing'
        />
        <NumberInput
          label={scopedLabel(_('Text Indent'), 'textIndent', setTextIndent)}
          value={textIndent}
          onChange={setTextIndent}
          disabled={useBookLayout}
          min={-2}
          max={4}
          step={1}
          data-setting-id='settings.layout.paragraphIndent'
        />
        <SettingsSwitchRow
          label={scopedLabel(_('Full Justification'), 'fullJustification', setFullJustification)}
          checked={fullJustification}
          disabled={useBookLayout}
          onChange={() => setFullJustification(!fullJustification)}
          data-setting-id='settings.layout.fullJustification'
        />
        <SettingsSwitchRow
          label={scopedLabel(_('Hyphenation'), 'hyphenation', setHyphenation)}
          checked={hyphenation}
          disabled={useBookLayout}
          onChange={() => setHyphenation(!hyphenation)}
          data-setting-id='settings.layout.hyphenation'
        />
      </BoxedList>

      <BoxedList title={_('Page')} data-setting-id='settings.layout.pageMargins'>
        <NumberInput
          label={
            // Header on/off (and vertical writing) swaps which of the two
            // stored margins this row edits, so the badge has to follow the
            // same branch or it would report the hidden one.
            showHeader && !isVertical
              ? scopedLabel(_('Top Margin (px)'), 'marginTopPx', setMarginTopPx)
              : scopedLabel(_('Top Margin (px)'), 'compactMarginTopPx', setCompactMarginTopPx)
          }
          value={showHeader && !isVertical ? marginTopPx : compactMarginTopPx}
          onChange={showHeader && !isVertical ? setMarginTopPx : setCompactMarginTopPx}
          min={
            showHeader && !isVertical
              ? Math.max(0, Math.round((16 - gridInsets.top) / 4) * 4) - gridInsets.top
              : 0
          }
          max={144}
          step={4}
        />
        <NumberInput
          label={
            showFooter && !isVertical
              ? scopedLabel(_('Bottom Margin (px)'), 'marginBottomPx', setMarginBottomPx)
              : scopedLabel(
                  _('Bottom Margin (px)'),
                  'compactMarginBottomPx',
                  setCompactMarginBottomPx,
                )
          }
          value={showFooter && !isVertical ? marginBottomPx : compactMarginBottomPx}
          onChange={showFooter && !isVertical ? setMarginBottomPx : setCompactMarginBottomPx}
          min={
            showFooter && !isVertical
              ? Math.max(0, Math.round((16 - gridInsets.bottom) / 4) * 4) - gridInsets.bottom
              : 0
          }
          max={144}
          step={4}
        />
        <NumberInput
          label={
            showFooter && isVertical
              ? scopedLabel(_('Left Margin (px)'), 'marginLeftPx', setMarginLeftPx)
              : scopedLabel(_('Left Margin (px)'), 'compactMarginLeftPx', setCompactMarginLeftPx)
          }
          value={showFooter && isVertical ? marginLeftPx : compactMarginLeftPx}
          onChange={showFooter && isVertical ? setMarginLeftPx : setCompactMarginLeftPx}
          min={0}
          max={144}
          step={4}
        />
        <NumberInput
          label={
            showHeader && isVertical
              ? scopedLabel(_('Right Margin (px)'), 'marginRightPx', setMarginRightPx)
              : scopedLabel(_('Right Margin (px)'), 'compactMarginRightPx', setCompactMarginRightPx)
          }
          value={showHeader && isVertical ? marginRightPx : compactMarginRightPx}
          onChange={showHeader && isVertical ? setMarginRightPx : setCompactMarginRightPx}
          min={0}
          max={144}
          step={4}
        />
        <NumberInput
          label={scopedLabel(_('Additional Margin (%)'), 'gapPercent', setGapPercent)}
          value={gapPercent}
          onChange={setGapPercent}
          min={0}
          max={30}
          data-setting-id='settings.layout.pageGap'
        />
        <NumberInput
          label={scopedLabel(_('Maximum Number of Columns'), 'maxColumnCount', setMaxColumnCount)}
          value={maxColumnCount}
          onChange={setMaxColumnCount}
          min={1}
          max={4}
          data-setting-id='settings.layout.maxColumnCount'
        />
        <NumberInput
          label={scopedLabel(
            viewSettings.vertical ? _('Maximum Column Height') : _('Maximum Column Width'),
            'maxInlineSize',
            setMaxInlineSize,
          )}
          value={maxInlineSize}
          onChange={setMaxInlineSize}
          disabled={false}
          min={200}
          max={9999}
          step={50}
          data-setting-id='settings.layout.maxInlineSize'
        />
        <NumberInput
          label={scopedLabel(
            viewSettings.vertical ? _('Maximum Column Width') : _('Maximum Column Height'),
            'maxBlockSize',
            setMaxBlockSize,
          )}
          value={maxBlockSize}
          onChange={setMaxBlockSize}
          disabled={false}
          min={400}
          max={9999}
          step={50}
          data-setting-id='settings.layout.maxBlockSize'
        />
      </BoxedList>

      <BoxedList title={_('Header & Footer')} data-setting-id='settings.layout.showHeader'>
        <SettingsSwitchRow
          label={scopedLabel(_('Show Header'), 'showHeader', setShowHeader)}
          checked={showHeader}
          onChange={() => setShowHeader(!showHeader)}
        />
        <SettingsSwitchRow
          label={scopedLabel(_('Show Footer'), 'showFooter', setShowFooter)}
          checked={showFooter}
          onChange={() => setShowFooter(!showFooter)}
          data-setting-id='settings.layout.showFooter'
        />
        <SettingsSwitchRow
          label={scopedLabel(_('Remaining Time'), 'showRemainingTime', setShowRemainingTime)}
          checked={showRemainingTime}
          disabled={!showFooter}
          onChange={() => {
            if (!showRemainingTime) {
              setShowRemainingTime(true);
              setShowRemainingPages(false);
            } else {
              setShowRemainingTime(false);
            }
          }}
        />
        <SettingsSwitchRow
          label={scopedLabel(_('Remaining Pages'), 'showRemainingPages', setShowRemainingPages)}
          checked={showRemainingPages}
          disabled={!showFooter}
          onChange={() => {
            if (!showRemainingPages) {
              setShowRemainingPages(true);
              setShowRemainingTime(false);
            } else {
              setShowRemainingPages(false);
            }
          }}
        />
        <SettingsSwitchRow
          label={scopedLabel(_('Reading Progress'), 'showProgressInfo', setShowProgressInfo)}
          checked={showProgressInfo}
          disabled={!showFooter}
          onChange={() => setShowProgressInfo(!showProgressInfo)}
        />
        <SettingsRow
          label={scopedLabel(_('Reading Progress Style'), 'progressStyle', setProgressStyle)}
          data-setting-id='settings.layout.progressDisplay'
        >
          <SettingsSelect
            value={progressStyle}
            onChange={(e) => setProgressStyle(e.target.value as 'percentage' | 'fraction')}
            ariaLabel={_('Reading Progress Style')}
            options={[
              { value: 'fraction', label: _('Page Number') },
              { value: 'percentage', label: _('Percentage') },
              { value: 'reference', label: _('Reference Pages') },
            ]}
            disabled={!showProgressInfo}
          />
        </SettingsRow>
        {progressStyle === 'reference' && !bookData?.bookDoc?.pageList?.length && (
          <NumberInput
            label={scopeTag.alwaysBook(_('Reference Page Count'))}
            value={referencePageCount}
            onChange={setReferencePageCount}
            // Saved with skipGlobal, so it has nowhere to go without a book.
            disabled={!showProgressInfo || !bookKey}
            min={0}
            max={10000}
            data-setting-id='settings.layout.referencePageCount'
          />
        )}
        <SettingsSwitchRow
          label={scopedLabel(_('Progress Bar'), 'showStickyProgressBar', setShowStickyProgressBar)}
          checked={showStickyProgressBar}
          disabled={!showFooter}
          onChange={() => setShowStickyProgressBar(!showStickyProgressBar)}
          data-setting-id='settings.layout.showStickyProgressBar'
        />
        <SettingsSwitchRow
          label={scopedLabel(_('Current Time'), 'showCurrentTime', setShowCurrentTime)}
          checked={showCurrentTime}
          disabled={!showFooter}
          onChange={() => setShowCurrentTime(!showCurrentTime)}
        />
        {showCurrentTime && (
          <SettingsSwitchRow
            label={scopedLabel(_('Use 24 Hour Clock'), 'use24HourClock', setUse24HourClock)}
            checked={use24HourClock}
            disabled={!showFooter}
            onChange={() => setUse24HourClock(!use24HourClock)}
          />
        )}
        <SettingsSwitchRow
          label={scopedLabel(
            _('Battery Status'),
            'showCurrentBatteryStatus',
            setShowCurrentBatteryStatus,
          )}
          checked={showCurrentBatteryStatus}
          disabled={!showFooter}
          onChange={() => setShowCurrentBatteryStatus(!showCurrentBatteryStatus)}
        />
        <SettingsSwitchRow
          label={scopedLabel(
            _('Battery Percentage'),
            'showBatteryPercentage',
            setShowBatteryPercentage,
          )}
          checked={showBatteryPercentage}
          disabled={!showFooter || !showCurrentBatteryStatus}
          onChange={() => setShowBatteryPercentage(!showBatteryPercentage)}
        />
      </BoxedList>

      {appService?.hasOrientationLock && (
        <BoxedList title={_('Screen')}>
          <SettingsRow
            label={scopedLabel(_('Orientation'), 'screenOrientation', setScreenOrientation)}
          >
            <div className='flex gap-4'>
              <div className='lg:tooltip lg:tooltip-bottom' data-tip={_('Auto')}>
                <button
                  className={`btn btn-ghost btn-circle btn-sm ${screenOrientation === 'auto' ? 'btn-active bg-base-300' : ''}`}
                  onClick={() => setScreenOrientation('auto')}
                >
                  <MdOutlineScreenRotation />
                </button>
              </div>
              <div className='lg:tooltip lg:tooltip-bottom' data-tip={_('Portrait')}>
                <button
                  className={`btn btn-ghost btn-circle btn-sm ${screenOrientation === 'portrait' ? 'btn-active bg-base-300' : ''}`}
                  onClick={() => setScreenOrientation('portrait')}
                >
                  <IoPhonePortraitOutline />
                </button>
              </div>
              <div className='lg:tooltip lg:tooltip-bottom' data-tip={_('Landscape')}>
                <button
                  className={`btn btn-ghost btn-circle btn-sm ${screenOrientation === 'landscape' ? 'btn-active bg-base-300' : ''}`}
                  onClick={() => setScreenOrientation('landscape')}
                >
                  <IoPhoneLandscapeOutline />
                </button>
              </div>
            </div>
          </SettingsRow>
        </BoxedList>
      )}
    </div>
  );
};

export default LayoutPanel;
