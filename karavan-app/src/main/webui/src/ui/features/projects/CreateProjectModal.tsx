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

import React, {useEffect} from 'react';
import {
    Alert,
    Button,
    Checkbox,
    Form,
    FormAlert,
    FormGroup,
    FormHelperText,
    FormSelect,
    FormSelectOption,
    HelperText,
    HelperTextItem,
    InputGroup,
    InputGroupItem,
    Modal,
    ModalBody,
    ModalFooter,
    ModalHeader,
    ModalVariant,
    TextInput
} from '@patternfly/react-core';
import {useAppConfigStore, useProjectsStore, useProjectStore} from "@stores/ProjectStore";
import {Project, ProjectRuntime, RESERVED_WORDS} from "@models/ProjectModels";
import {isValidProjectId, nameToProjectId} from "@util/StringUtils";
import {EventBus} from "@features/project/designer/utils/EventBus";
import {SubmitHandler, useForm} from "react-hook-form";
import {useFormUtil} from "@util/useFormUtil";
import {KaravanApi} from "@api/KaravanApi";
import {AxiosResponse} from "axios";
import {shallow} from "zustand/shallow";
import {useNavigate} from "react-router-dom";
import {ROUTES} from "@app/navigation/Routes";

export function CreateProjectModal() {

    const [project, operation, setOperation] = useProjectStore((s) => [s.project, s.operation, s.setOperation], shallow);
    const [projects, setProjects] = useProjectsStore((s) => [s.projects, s.setProjects], shallow);
    const [config] = useAppConfigStore((s) => [s.config], shallow);
    const [isReset, setReset] = React.useState(false);
    const [isProjectIdChanged, setIsProjectIdChanged] = React.useState(false);
    const [backendError, setBackendError] = React.useState<string>();
    // Optional per-project Git remote: enter a repository URL, Fetch its branches
    // (authenticated with the current user's Git credentials from System settings),
    // then pick a branch.
    const [gitRepository, setGitRepository] = React.useState<string>('');
    const [gitBranch, setGitBranch] = React.useState<string>('');
    const [branches, setBranches] = React.useState<string[]>([]);
    const [fetching, setFetching] = React.useState<boolean>(false);
    const [fetchError, setFetchError] = React.useState<string>();
    const [fetched, setFetched] = React.useState<boolean>(false);
    const [createNewBranch, setCreateNewBranch] = React.useState<boolean>(false);
    const [addSample, setAddSample] = React.useState<boolean>(false);
    // Always holds the latest repository URL so a late "Fetch" response for a URL
    // the user has since edited can be discarded (last-request-wins).
    const latestRepoRef = React.useRef<string>('');
    const formContext = useForm<Project>({mode: "all"});
    const {getTextField, getFormSelect} = useFormUtil(formContext);
    const {
        formState: {errors},
        handleSubmit,
        reset,
        trigger,
        setValue,
        getValues
    } = formContext;
    const navigate = useNavigate();

    useEffect(() => {
        const p = new Project();
        // Seed the Camel runtime from the backend's configured default for new projects.
        if (config.defaultRuntime) {
            p.runtime = config.defaultRuntime;
        }
        if (operation === 'copy') {
            p.projectId = project.projectId;
            p.name = project.name;
            p.type = project.type;
            p.runtime = project.runtime ?? p.runtime;
        }
        reset(p);
        setBackendError(undefined);
        setGitRepository(operation === 'copy' ? (project.gitRepository ?? '') : '');
        setGitBranch(operation === 'copy' ? (project.gitBranch ?? '') : '');
        setBranches(project.gitBranch ? [project.gitBranch] : []);
        setFetchError(undefined);
        setFetched(false);
        setCreateNewBranch(false);
        setAddSample(false);
        setReset(true);
    }, [reset, config.defaultRuntime]);

    React.useEffect(() => {
        isReset && trigger();
    }, [trigger, isReset]);

    function closeModal() {
        setOperation("none");
    }

    function fetchBranches() {
        const requested = gitRepository.trim();
        latestRepoRef.current = requested;
        setFetching(true);
        setFetchError(undefined);
        KaravanApi.fetchBranches(requested, (res) => {
            // Discard a stale response if the user has since edited the URL.
            if (latestRepoRef.current !== requested) {
                return;
            }
            setFetching(false);
            if (res.status === 200) {
                const list: string[] = res.data?.branches ?? [];
                setBranches(list);
                setFetched(true);
                if (list.length === 0) {
                    // Empty repo: there is nothing to select — the user names the
                    // first branch (created on first push).
                    setCreateNewBranch(true);
                    setGitBranch('main');
                } else {
                    setCreateNewBranch(false);
                    if (!list.includes(gitBranch)) {
                        setGitBranch(list[0]);
                    }
                }
            } else {
                setBranches([]);
                setFetched(false);
                setFetchError(res?.response?.data || 'Unable to fetch branches');
            }
        });
    }

    const onSubmit: SubmitHandler<Project> = (data) => {
        // Repository + branch are mandatory (the Save button is disabled otherwise).
        const payload: Project = {
            ...data,
            gitRepository: gitRepository.trim(),
            gitBranch: gitBranch,
        };
        if (operation === 'copy') {
            KaravanApi.copyProject(project.projectId, payload, after)
        } else {
            KaravanApi.postProject(payload, after, addSample)
        }
    }

    function after (result: boolean, res: AxiosResponse<Project> | any) {
        if (result) {
            onSuccess(res.data.projectId);
        } else {
            setBackendError(res?.response?.data);
        }
    }

    function onSuccess (projectId: string) {
        const message = operation !== "copy" ? "Project successfully created." : "Project successfully copied.";
        EventBus.sendAlert( "Success", message, "success");
        KaravanApi.getProjects((projects: Project[]) => {
            setProjects(projects);
            setOperation("none");
            navigate(`${ROUTES.PROJECTS}/${projectId}`);
        });
    }

    function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>): void {
        if (event.key === 'Enter') {
            handleSubmit(onSubmit)()
        }
    }

    function onNameChange (value: string) {
        if (!isProjectIdChanged) {
            setValue('projectId', nameToProjectId(value), {shouldValidate: true})
        }
    }
    function onIdChange (value: string) {
        setIsProjectIdChanged(true)
    }

    return (
        <Modal
            variant={ModalVariant.small}
            isOpen={["create", "copy"].includes(operation)}
            onClose={closeModal}
            onKeyDown={onKeyDown}
        >

            <ModalHeader title={operation !== 'copy' ? "Create Project" : "Copy Project from " + project?.projectId}/>
            <ModalBody>
                <Form isHorizontal={true} autoComplete="off">
                    {getTextField('name', 'Name', {
                        length: v => v.length > 5 || 'Project name should be longer that 5 characters',
                    }, 'text', onNameChange)}
                    {getTextField('projectId', 'Project ID', {
                        regex: v => isValidProjectId(v) || 'Only lowercase characters, numbers and dashes allowed',
                        length: v => v.length > 5 || 'Project ID should be longer that 5 characters',
                        name: v => !RESERVED_WORDS.includes(v) || "Reserved word",
                        uniques: v => !projects.map(p=> p.name).includes(v) || "Project already exists!",
                    }, 'text', onIdChange)}
                    {getFormSelect('runtime', 'Camel Runtime', [
                        [ProjectRuntime.CAMEL_MAIN, 'Camel Main'],
                        [ProjectRuntime.QUARKUS, 'Quarkus'],
                        [ProjectRuntime.SPRING_BOOT, 'Spring Boot'],
                    ])}
                    <FormGroup label="Git repository" fieldId="gitRepository" isRequired>
                        <InputGroup>
                            <InputGroupItem isFill>
                                <TextInput
                                    id="gitRepository"
                                    type="text"
                                    isRequired
                                    validated={gitRepository.trim().length === 0 ? 'error' : 'default'}
                                    placeholder="https://github.com/org/repo.git"
                                    autoComplete="off"
                                    value={gitRepository}
                                    onChange={(_e, v) => {
                                        latestRepoRef.current = v.trim();
                                        setGitRepository(v);
                                        setBranches([]);
                                        setGitBranch('');
                                        setFetchError(undefined);
                                        setFetched(false);
                                        setCreateNewBranch(false);
                                    }}
                                />
                            </InputGroupItem>
                            <InputGroupItem>
                                <Button variant="secondary"
                                        isLoading={fetching}
                                        isDisabled={fetching || gitRepository.trim().length === 0}
                                        onClick={fetchBranches}>
                                    Fetch
                                </Button>
                            </InputGroupItem>
                        </InputGroup>
                        <FormHelperText>
                            <HelperText>
                                <HelperTextItem variant={gitRepository.trim() && !gitBranch ? 'warning' : 'default'}>
                                    Required. Enter the repository URL, click Fetch, then select a branch.
                                    Credentials come from System → Git.
                                </HelperTextItem>
                            </HelperText>
                        </FormHelperText>
                    </FormGroup>
                    {fetched &&
                        <FormGroup label="Branch" fieldId="gitBranch" isRequired>
                            {branches.length > 0 && !createNewBranch ? (
                                <FormSelect id="gitBranch" value={gitBranch}
                                            validated={!gitBranch ? 'error' : 'default'}
                                            onChange={(_e, v) => setGitBranch(v)}>
                                    <FormSelectOption key="__none" value="" label="Select a branch" isDisabled/>
                                    {branches.map((b) => (
                                        <FormSelectOption key={b} value={b} label={b}/>
                                    ))}
                                </FormSelect>
                            ) : (
                                <TextInput id="gitBranch" type="text"
                                           placeholder="new-branch-name"
                                           autoComplete="off"
                                           validated={!gitBranch.trim() || /\s/.test(gitBranch) ? 'error' : 'default'}
                                           value={gitBranch}
                                           onChange={(_e, v) => setGitBranch(v)}/>
                            )}
                            {branches.length > 0 &&
                                <Checkbox id="createNewBranch"
                                          label="Create a new branch (none of the remote branches fit)"
                                          isChecked={createNewBranch}
                                          onChange={(_e, checked) => {
                                              setCreateNewBranch(checked);
                                              setGitBranch(checked ? '' : branches[0]);
                                          }}/>
                            }
                            {branches.length === 0 &&
                                <FormHelperText>
                                    <HelperText>
                                        <HelperTextItem>Repository is empty — name the first branch (created on first push).</HelperTextItem>
                                    </HelperText>
                                </FormHelperText>
                            }
                        </FormGroup>
                    }
                    {fetchError &&
                        <FormAlert>
                            <Alert variant="warning" title={fetchError} aria-live="polite" isInline/>
                        </FormAlert>
                    }
                    <Checkbox id="addSample"
                              label="Add Sample (scaffold a starter Camel route)"
                              isChecked={addSample}
                              onChange={(_e, checked) => setAddSample(checked)}/>
                    {backendError &&
                        <FormAlert>
                            <Alert variant="danger" title={backendError} aria-live="polite" isInline />
                        </FormAlert>
                    }
                </Form>
            </ModalBody>
            <ModalFooter>
                <Button key="confirm" variant="primary"
                        onClick={handleSubmit(onSubmit)}
                        isDisabled={Object.getOwnPropertyNames(errors).length > 0
                            || gitRepository.trim().length === 0
                            || !gitBranch.trim() || /\s/.test(gitBranch)}
                >
                    Save
                </Button>
                <Button key="cancel" variant="secondary" onClick={closeModal}>Cancel</Button>
            </ModalFooter>
        </Modal>
    )
}