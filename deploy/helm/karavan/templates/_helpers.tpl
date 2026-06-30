{{- define "karavan.name" -}}
{{- default "karavan" .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "karavan.fullname" -}}
{{- include "karavan.name" . -}}
{{- end -}}

{{- define "karavan.labels" -}}
app.kubernetes.io/name: {{ include "karavan.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version }}
{{- end -}}

{{- define "karavan.postgres.fullname" -}}
{{- printf "%s-postgres" (include "karavan.fullname" .) -}}
{{- end -}}

{{- define "karavan.oidc.secretName" -}}
{{- if .Values.auth.oidc.existingSecret -}}
{{- .Values.auth.oidc.existingSecret -}}
{{- else -}}
{{- printf "%s-oidc" (include "karavan.fullname" .) -}}
{{- end -}}
{{- end -}}
