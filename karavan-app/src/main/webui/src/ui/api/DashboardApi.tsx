import axios from "axios";
import {AuthApi} from "@api/auth/AuthApi";
import {ErrorEventBus} from "@bus/ErrorEventBus";
import {IntegrationFile} from "@core/model/IntegrationDefinition";

axios.defaults.headers.common['Accept'] = 'application/json';
axios.defaults.headers.common['Content-Type'] = 'application/json';
const instance = AuthApi.getInstance();

export class DashboardApi {

    // Health + metrics are derived client-side from the Camel context status
    // (see DashboardService) — there are no /ui/health or /ui/metric endpoints.

    static async getRuntimeSources(projectId: string, after: (ifiles: IntegrationFile[]) => void) {
        instance.get('/ui/runtime/sources/' + projectId)
            .then(res => {
                if (res.status === 200) {
                    const files: IntegrationFile[] = Object.getOwnPropertyNames(res?.data).map(key => new IntegrationFile(key, res.data[key]));
                    after(files);
                } else {
                    after([]);
                }
            }).catch(err => {
            ErrorEventBus.sendApiError(err);
            after([]);
        });
    }
}
