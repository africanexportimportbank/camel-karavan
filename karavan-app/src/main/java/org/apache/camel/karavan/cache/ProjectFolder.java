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

package org.apache.camel.karavan.cache;

import org.apache.camel.karavan.KaravanConstants.CamelRuntime;

import java.time.Instant;
import java.util.Arrays;
import java.util.List;

public class ProjectFolder {

    public enum Type {
        templates,
        kamelets,
        configuration,
        documentation,
        contracts,
        services,
        integration,
        backlog,
    }

    String projectId;
    String name;
    Long lastUpdate = 0L;
    Type type;
    // Per-project Git remote. When set, this project is committed/pushed to its
    // own repository+branch (selected via the "Fetch branches" action in the UI)
    // using the owning user's credentials from System -> Git. Null => the project
    // is local-only (no Git operations). gitOwner is the username that configured
    // the remote: only that user may configure/push/pull/build it.
    String gitRepository;
    String gitBranch;
    String gitOwner;
    // Camel runtime the project is built/run with: "camel-main" (default), "quarkus"
    // or "spring-boot" (see KaravanConstants.CamelRuntime). Drives which application
    // properties template is generated and which build path build.sh takes (via the
    // CAMEL_RUNTIME env injected into the build pod/container).
    String runtime = CamelRuntime.CAMEL_MAIN.getValue();

    public ProjectFolder(String projectId, String name, Long lastUpdate, Type type) {
        this.projectId = projectId;
        this.name = name;
        this.lastUpdate = lastUpdate;
        this.type = type;
    }

    public ProjectFolder(String projectId, String name, Long lastUpdate) {
        this.projectId = projectId;
        this.name = name;
        this.lastUpdate = lastUpdate;
        this.type = Arrays.stream(Type.values()).anyMatch(t -> t.name().equals(projectId)) ? Type.valueOf(projectId) : Type.integration;
    }

    public ProjectFolder(String projectId, String name) {
        this.projectId = projectId;
        this.name = name;
        this.lastUpdate = Instant.now().getEpochSecond() * 1000L;
        this.type = Arrays.stream(Type.values()).anyMatch(t -> t.name().equals(projectId)) ? Type.valueOf(projectId) : Type.integration;
    }

    public ProjectFolder copy() {
        ProjectFolder c = new ProjectFolder(projectId, name, lastUpdate, type);
        c.gitRepository = gitRepository;
        c.gitBranch = gitBranch;
        c.gitOwner = gitOwner;
        c.runtime = runtime;
        return c;
    }

    public ProjectFolder() {
        this.type = Type.integration;
    }

    public String getProjectId() {
        return projectId;
    }

    public void setProjectId(String projectId) {
        this.projectId = projectId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Long getLastUpdate() {
        return lastUpdate;
    }

    public void setLastUpdate(Long lastUpdate) {
        this.lastUpdate = lastUpdate;
    }

    public Type getType() {
        return type;
    }

    public void setType(Type type) {
        this.type = type;
    }

    public String getGitRepository() {
        return gitRepository;
    }

    public void setGitRepository(String gitRepository) {
        this.gitRepository = gitRepository;
    }

    public String getGitBranch() {
        return gitBranch;
    }

    public void setGitBranch(String gitBranch) {
        this.gitBranch = gitBranch;
    }

    public String getGitOwner() {
        return gitOwner;
    }

    public void setGitOwner(String gitOwner) {
        this.gitOwner = gitOwner;
    }

    public String getRuntime() {
        return runtime != null ? runtime : CamelRuntime.CAMEL_MAIN.getValue();
    }

    public void setRuntime(String runtime) {
        this.runtime = runtime;
    }

    public static List<String> getBuildInNames(){
        return List.of(
                Type.configuration.name(),
                Type.kamelets.name(),
                Type.templates.name(),
                Type.contracts.name(),
                Type.documentation.name(),
                Type.backlog.name()
        );
    }

    @Override
    public String toString() {
        return "Project{" +
                "projectId='" + projectId + '\'' +
                ", name='" + name + '\'' +
                ", lastUpdate=" + lastUpdate +
                ", type=" + type +
                '}';
    }
}