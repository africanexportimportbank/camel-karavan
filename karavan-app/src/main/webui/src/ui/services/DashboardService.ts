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
import {useHealthStore, useMetricStore} from "@stores/DashboardStore";
import {useStatusesStore} from "@stores/ProjectStore";
import {Health, Metric} from "@models/DashboardModels";
import {CamelStatus} from "@models/ProjectModels";

/**
 * Per-container health + metrics are derived from the Camel context status already
 * collected via /ui/status/camel (StatusesStore.camelContexts). There are no
 * separate /ui/health or /ui/metric endpoints — deriving here avoids two redundant
 * requests (which 404'd) and keeps the dashboard on the same source the topology
 * and dashboard hooks parse.
 */
function parseStatus(statusJson?: string): any {
    try {
        return statusJson ? JSON.parse(statusJson) : {};
    } catch {
        return {};
    }
}

function findStatus(cs: CamelStatus, name: string): any {
    return parseStatus(cs.statuses?.find(s => s.name === name)?.status);
}

function toHealth(cs: CamelStatus): Health {
    const h = new Health();
    h.projectId = cs.projectId;
    h.containerName = cs.containerName;
    h.env = cs.env ?? '';
    h.updateDateTime = Date.now();
    const context = findStatus(cs, 'context')?.context;
    h.contextName = context?.name ?? '';
    h.contextVersion = context?.version ?? '';
    h.contextStatus = context?.state ?? '';
    h.status = context?.state === 'Started' ? 'UP' : (context ? 'DOWN' : '');
    const routes = findStatus(cs, 'route')?.route?.routes ?? [];
    h.routesStatus = routes.length === 0 ? '' : (routes.every((r: any) => r.state === 'Started') ? 'UP' : 'DOWN');
    const consumers = findStatus(cs, 'consumer')?.consumer?.consumers ?? [];
    h.consumersStatus = consumers.length === 0 ? '' : (consumers.every((c: any) => c.state === 'Started') ? 'UP' : 'DOWN');
    return h;
}

function toMetric(cs: CamelStatus): Metric {
    const m = new Metric();
    m.projectId = cs.projectId;
    m.containerName = cs.containerName;
    m.env = cs.env ?? '';
    m.updateDateTime = Date.now();
    const statistics = findStatus(cs, 'context')?.context?.statistics;
    m.total = statistics?.exchangesTotal ?? 0;
    m.failed = statistics?.exchangesFailed ?? 0;
    m.inflight = statistics?.exchangesInflight ?? 0;
    m.succeeded = m.total - m.failed;
    return m;
}

export class DashboardService {

    public static refreshAllHealth() {
        const camelContexts = useStatusesStore.getState().camelContexts ?? [];
        useHealthStore.setState({healths: camelContexts.map(toHealth)});
    }

    public static refreshAllMetrics() {
        const camelContexts = useStatusesStore.getState().camelContexts ?? [];
        useMetricStore.setState({metrics: camelContexts.map(toMetric)});
    }
}
