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
import React, {JSX} from 'react';
import {capitalize, Nav, NavItem, NavList,} from '@patternfly/react-core';
import '@features/project/ProjectPage.css';
import {
    ProjectMenu,
    ProjectMenus,
    useFilesStore,
    useFileStore,
    useProjectStore,
} from '@stores/ProjectStore';
import {BUILD_IN_PROJECTS} from '@models/ProjectModels';
import {ProjectContainersContext} from "@features/project/ProjectContainersContextProvider";

// Runtime tabs (dev "Log", "Build", "Pod") used to live here and would force-switch
// the panel to a full-screen log when a container started — yanking the user out of
// the route designer. Those logs and their run/build actions now live in the
// always-available bottom console drawer (see BottomConsole), so the navbar only
// carries the static project menu.
const HIDDEN_FROM_NAV: ProjectMenu[] = ['build'];

export function ProjectPageNavigation(): JSX.Element {

    const context = React.useContext(ProjectContainersContext);
    if (!context) throw new Error("ProjectContainersContext not found!");
    const {containersStatusIcons} = context;

    const [files] = useFilesStore((s) => [s.files]);
    const [project, tabIndex, setTabIndex] = useProjectStore((s) => [s.project, s.tabIndex, s.setTabIndex]);
    const [setFile] = useFileStore((s) => [s.setFile]);

    function isBuildIn(): boolean {
        return BUILD_IN_PROJECTS.includes(project?.projectId);
    }

    function hasReadme(): boolean {
        return files.map(f => f?.name).findIndex(f => f?.toLowerCase() === 'readme.md') !== -1;
    }

    const onNavSelect = (_: any, selectedItem: {
                             groupId: number | string;
                             itemId: number | string;
                             to: string;
                         }
    ) => {
        setTabIndex(selectedItem.itemId as ProjectMenu);
        setFile('none', undefined);
    };

    function getProjectMenu(): ProjectMenu[] {
        let menu: ProjectMenu[] = []
        if (isBuildIn()) {
            menu.push('source');
        } else {
            menu.push(...ProjectMenus.filter(m => !HIDDEN_FROM_NAV.includes(m)));
        }
        if (!hasReadme()) {
            menu = menu.filter(m => m !== 'readme')
        }
        return menu;
    }

    return (
        <Nav onSelect={onNavSelect} aria-label="Nav1" variant="horizontal" className="project-page-navigation">
            <NavList>
                {getProjectMenu().map((item) =>
                    <NavItem key={item} preventDefault itemId={item} isActive={tabIndex === item} to="#">
                        {capitalize(item)}
                    </NavItem>
                )}
            </NavList>
            {containersStatusIcons}
        </Nav>
    )
}
