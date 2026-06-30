/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React from 'react';
import {Badge, Button, Flex, FlexItem, Label, Tooltip, TooltipPosition} from '@patternfly/react-core';
import DownIcon from "@patternfly/react-icons/dist/esm/icons/error-circle-o-icon";
import UpIcon from "@patternfly/react-icons/dist/esm/icons/check-circle-icon";
import DeleteIcon from "@patternfly/react-icons/dist/esm/icons/trash-icon";
import StopIcon from "@patternfly/react-icons/dist/esm/icons/stop-icon";
import RunIcon from "@patternfly/react-icons/dist/esm/icons/play-icon";
import LogIcon from "@patternfly/react-icons/dist/esm/icons/file-alt-icon";
import {ContainerStatus} from "@models/ProjectModels";
import {Td, Tr} from "@patternfly/react-table";
import {useProjectStore, useSelectedContainerStore} from "@stores/ProjectStore";
import {shallow} from "zustand/shallow";
import {KaravanApi} from "@api/KaravanApi";
import {EventBus} from "@features/project/designer/utils/EventBus";

interface Props {
    containerStatus: ContainerStatus,
    index: number,
}

export function ContainersTableRow(props: Props) {

    const {containerStatus, index} = props;
    const [project] = useProjectStore((s) => [s.project], shallow);
    const setSelectedContainerName = useSelectedContainerStore((s) => s.setSelectedContainerName);

    const commands = containerStatus.commands || [];
    const inTransit = containerStatus.inTransit;

    function getPodInfoLabel(info: React.ReactNode) {
        return (
            <Label icon={getIcon()} color={getColor()}>
                {info}
            </Label>
        )
    }

    function getIcon() {
        return (getRunning() ? <UpIcon/> : <DownIcon/>)
    }

    function getColor() {
        if (getRunning()) {
            return "green";
        }
        // A pod that is neither running nor cleanly stopped (crash-loop, image error,
        // missing status) is a problem — show it red, not the same grey as "exited".
        const state = (containerStatus.state || '').toLowerCase();
        const stopped = state === 'exited' || state === 'stopped' || state === 'created';
        return stopped ? "grey" : "red";
    }

    function getRunning(): boolean {
        return containerStatus.state === 'running';
    }

    // Never render a blank/raw "unknown" next to the name — give the state cell a
    // readable fallback so it can't visually merge with the pod name.
    function getStateLabel(): string {
        const state = containerStatus.state;
        return state && state.trim().length > 0 ? state : 'unknown';
    }

    function manage(command: 'run' | 'stop' | 'delete') {
        KaravanApi.manageContainer(project.projectId, containerStatus.type, containerStatus.containerName, command, 'never', res => {
            const response = res?.response;
            if (response?.status >= 400) {
                EventBus.sendAlert('Error', response.data?.length > 0 ? response.data : response.statusText, 'warning');
            }
        });
    }

    return (
        <Tr key={index} style={{verticalAlign: "middle"}}>
            <Td>
                {getPodInfoLabel(
                    <span style={{display: 'inline-flex', alignItems: 'center', gap: '6px'}}>
                        {containerStatus.containerName}
                        {containerStatus.type &&
                            <Badge isRead>{containerStatus.type}</Badge>}
                    </span>
                )}
            </Td>
            <Td>
                {getPodInfoLabel(getStateLabel())}
            </Td>
            <Td>{(containerStatus.created)}</Td>
            <Td>
                {containerStatus.type === 'build'
                    ? <Tooltip content="Image that runs the build job (the build tooling) — not the image being produced">
                        <span style={{display: 'inline-flex', alignItems: 'center', gap: '6px'}}>
                            {containerStatus.image}<Badge isRead>builder</Badge>
                        </span>
                      </Tooltip>
                    : containerStatus.image}
            </Td>
            <Td>{(containerStatus.cpuInfo)}</Td>
            <Td>{(containerStatus.memoryInfo)}</Td>
            <Td isActionCell>
                <Flex direction={{default: "row"}} flexWrap={{default: 'nowrap'}}
                      spaceItems={{default: 'spaceItemsNone'}} justifyContent={{default: 'justifyContentFlexEnd'}}>
                    <FlexItem>
                        <Tooltip content="View logs" position={TooltipPosition.left}>
                            <Button variant="plain" aria-label="View logs" icon={<LogIcon/>}
                                    onClick={() => setSelectedContainerName(containerStatus.containerName)}/>
                        </Tooltip>
                    </FlexItem>
                    {commands.includes('run') &&
                        <FlexItem>
                            <Tooltip content="Run" position={TooltipPosition.left}>
                                <Button variant="plain" aria-label="Run" isDisabled={inTransit}
                                        icon={<RunIcon/>} onClick={() => manage('run')}/>
                            </Tooltip>
                        </FlexItem>
                    }
                    {commands.includes('stop') &&
                        <FlexItem>
                            <Tooltip content="Stop" position={TooltipPosition.left}>
                                <Button variant="plain" aria-label="Stop" isDisabled={inTransit}
                                        icon={<StopIcon/>} onClick={() => manage('stop')}/>
                            </Tooltip>
                        </FlexItem>
                    }
                    {commands.includes('delete') &&
                        <FlexItem>
                            <Tooltip content="Delete" position={TooltipPosition.left}>
                                <Button variant="plain" aria-label="Delete" isDanger isDisabled={inTransit}
                                        icon={<DeleteIcon/>} onClick={() => manage('delete')}/>
                            </Tooltip>
                        </FlexItem>
                    }
                </Flex>
            </Td>
        </Tr>
    )
}
