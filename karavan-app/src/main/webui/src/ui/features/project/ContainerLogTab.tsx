import React, {ReactElement, ReactNode, useEffect, useRef, useState} from 'react';
import {useSelectedContainerStore} from "@stores/ProjectStore";
import {shallow} from "zustand/shallow";
import {LogWatchApi} from "@api/LogWatchApi";
import {LogViewer, LogViewerSearch} from '@patternfly/react-log-viewer';
import {Button, Checkbox, Tooltip, TooltipPosition} from "@patternfly/react-core";
import {ProjectEventBus} from "@bus/ProjectEventBus";
import {TrashAltIcon} from "@patternfly/react-icons";
import TextWidthIcon from "@patternfly/react-icons/dist/esm/icons/text-width-icon";
import AngleDoubleDownIcon from "@patternfly/react-icons/dist/esm/icons/angle-double-down-icon";
import EraserIcon from "@patternfly/react-icons/dist/esm/icons/eraser-icon";
import DownloadIcon from "@patternfly/react-icons/dist/esm/icons/download-icon";
import FileSaver from "file-saver";
import {ProjectContainerContextToolbar} from "@features/project/ProjectContainerContextToolbar";
import {useLogStore} from "@stores/LogStore";

interface ContainerLogTabProps {
    // Compact mode is used by the bottom console drawer: it slims the toolbar
    // (no project title / container toggle) and fills the drawer height.
    compact?: boolean;
    // When set (compact mode), the host merges the log controls into its own single
    // toolbar strip instead of the log viewer rendering a second toolbar row. The
    // search box must live inside the LogViewer, so the host receives it as a slot.
    renderToolbar?: (logControls: ReactNode) => ReactNode;
}

export function ContainerLogTab({compact = false, renderToolbar}: ContainerLogTabProps) {

    const [selectedContainerName] = useSelectedContainerStore((s) => [s.selectedContainerName]);
    const logViewerRef = useRef(null);
    const [data, setData] = useLogStore((state) => [state.data, state.setData], shallow);

    const [isTextWrapped, setIsTextWrapped] = useState(true);
    const [autoScroll, setAutoScroll] = useState(true);
    const showLogger = selectedContainerName !== undefined && selectedContainerName !== null;
    const [controller, setController] = React.useState(new AbortController());

    useEffect(() => {
        setData([]);
        controller.abort()
        const c = new AbortController();
        setController(c);
        if (selectedContainerName) {
            const f = LogWatchApi.fetchData('container', selectedContainerName, c).then(_ => {
            });
        }
        return () => {
            c.abort();
        };
    }, [selectedContainerName]);

    // Export the current log buffer as a CSV: each line is split into
    // timestamp / level / message when it matches the standard Camel log format,
    // otherwise the whole line lands in the message column.
    function downloadCsv() {
        const rows = showLogger ? data : [];
        const escape = (s: string) => `"${(s ?? '').replace(/"/g, '""')}"`;
        const re = /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d{3})\s+(\w+)\s+(.*)$/;
        const lines = rows.map((line, i) => {
            const m = re.exec(line);
            const [timestamp, level, message] = m ? [m[1], m[2], m[3]] : ['', '', line];
            return [i + 1, escape(timestamp), escape(level), escape(message)].join(',');
        });
        const csv = ['line,timestamp,level,message', ...lines].join('\r\n');
        const blob = new Blob([csv], {type: 'text/csv;charset=utf-8'});
        const stamp = new Date().toISOString().replace(/[:.]/g, '-');
        FileSaver.saveAs(blob, `${selectedContainerName || 'log'}-${stamp}.csv`);
    }

    const canDownload = showLogger && data.length > 0;

    function getToolbar() {
        return (
            <div style={{display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px', paddingRight: '16px'}}>
                <LogViewerSearch placeholder={'search'} minSearchChars={4} style={{width: "400px"}}/>
                <Tooltip content={"Clean log"} position={TooltipPosition.bottom}>
                    <Button variant="plain" onClick={() => ProjectEventBus.sendLog('set', '')} icon={<TrashAltIcon/>}/>
                </Tooltip>
                <Tooltip content={"Download log as CSV"} position={TooltipPosition.bottom}>
                    <Button variant="plain" aria-label="Download log as CSV" isDisabled={!canDownload}
                            onClick={downloadCsv} icon={<DownloadIcon/>}/>
                </Tooltip>
                <Checkbox label="Wrap text" aria-label="wrap text checkbox" isChecked={isTextWrapped}
                          id="wrap-text-checkbox"
                          onChange={(_, checked) => setIsTextWrapped(checked)}/>
                <Checkbox label="Autoscroll" aria-label="autoscroll checkbox" isChecked={autoScroll}
                          id="autoscroll-checkbox"
                          onChange={(_, checked) => setAutoScroll(checked)}/>
            </div>
        );
    }

    // Dense, icon-only log controls for the merged bottom-console strip: search +
    // wrap / follow toggles + clear. Labels become tooltips to save horizontal space.
    function getCompactControls(): ReactElement {
        return (
            <div className="console-logcontrols">
                <LogViewerSearch placeholder={'Find in log'} minSearchChars={3} className="console-search"/>
                <Tooltip content={"Wrap lines"} position={TooltipPosition.top}>
                    <Button variant="plain" aria-label="Wrap lines"
                            className={`console-toggle${isTextWrapped ? ' is-on' : ''}`}
                            icon={<TextWidthIcon/>} onClick={() => setIsTextWrapped(!isTextWrapped)}/>
                </Tooltip>
                <Tooltip content={autoScroll ? "Following new lines" : "Follow new lines"} position={TooltipPosition.top}>
                    <Button variant="plain" aria-label="Follow new lines"
                            className={`console-toggle${autoScroll ? ' is-on' : ''}`}
                            icon={<AngleDoubleDownIcon/>} onClick={() => setAutoScroll(!autoScroll)}/>
                </Tooltip>
                <Tooltip content={"Clear log"} position={TooltipPosition.top}>
                    <Button variant="plain" aria-label="Clear log"
                            className="console-toggle"
                            icon={<EraserIcon/>} onClick={() => ProjectEventBus.sendLog('set', '')}/>
                </Tooltip>
                <Tooltip content={"Download log as CSV"} position={TooltipPosition.top}>
                    <Button variant="plain" aria-label="Download log as CSV"
                            className="console-toggle" isDisabled={!canDownload}
                            icon={<DownloadIcon/>} onClick={downloadCsv}/>
                </Tooltip>
            </div>
        );
    }


    const FooterButton = () => {
        const handleClick = () => {
            logViewerRef.current.scrollToBottom();
        };
        return (
            <div style={{display: 'flex', flexDirection: 'row', justifyContent:'center', alignItems: 'center', gap: '8px'}}>
                <Button variant={'link'} onClick={handleClick}>Jump to the bottom</Button>
            </div>
        );
    };

    const currentLine = data.length > 0 ? data.length - 1 : 0;
    return (
            <LogViewer
                    ref={logViewerRef}
                    isTextWrapped={isTextWrapped}
                    hasLineNumbers={false}
                    loadingContent={"Loading..."}
                    height={compact ? "100%" : "100vh"}
                    data={showLogger && data.length > 0 ? data : []}
                    scrollToRow={autoScroll ? currentLine : undefined}
                    theme={'dark'}
                    toolbar={
                        compact
                            ? (renderToolbar
                                ? renderToolbar(getCompactControls())
                                : <ProjectContainerContextToolbar additionalTools={getCompactControls()} hideContainersToggle hideTitle/>)
                            : <ProjectContainerContextToolbar additionalTools={getToolbar()}/>
                    }
                    footer={compact ? undefined : <FooterButton />}
                />
    );
}
