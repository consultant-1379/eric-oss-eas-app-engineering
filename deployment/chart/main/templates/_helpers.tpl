{{/*
Expand the name of the chart.
*/}}
{{- define "eric-oss-eas-app-engineering.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}
{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "eric-oss-eas-app-engineering.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}
{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "eric-oss-eas-app-engineering.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}
{{/*
Create Ericsson product app.kubernetes.io info
*/}}
{{- define "eric-oss-eas-app-engineering.kubernetes-io-info" -}}
app.kubernetes.io/name: {{ .Chart.Name | quote }}
app.kubernetes.io/version: {{ .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" | quote }}
app.kubernetes.io/instance: {{ .Release.Name | quote }}
{{- end -}}
{{/*
Create Ericsson Product Info
*/}}
{{- define "eric-oss-eas-app-engineering.helm-annotations" -}}
ericsson.com/product-name: "OSS EAS App Engineering"
ericsson.com/product-number: "N/A"
ericsson.com/product-revision: "R1A"
{{- end}}
{{/*
Create annotation for the product information (DR-D1121-064, DR-D1121-067)
*/}}
{{- define "eric-oss-eas-app-engineering.product-info" }}
ericsson.com/product-name: {{ (fromYaml (.Files.Get "eric-product-info.yaml")).productName | quote }}
ericsson.com/product-number: {{ (fromYaml (.Files.Get "eric-product-info.yaml")).productNumber | quote }}
ericsson.com/product-revision: {{ regexReplaceAll "(.*)[+|-].*" .Chart.Version "${1}" | quote }}
{{- end}}
{{/*
Common labels
*/}}
{{- define "eric-oss-eas-app-engineering.labels" -}}
helm.sh/chart: {{ include "eric-oss-eas-app-engineering.chart" . }}
{{ include "eric-oss-eas-app-engineering.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}
{{/*
Selector labels
*/}}
{{- define "eric-oss-eas-app-engineering.selectorLabels" -}}
app.kubernetes.io/name: {{ include "eric-oss-eas-app-engineering.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}
{{/*
Create the name of the service account to use
*/}}
{{- define "eric-oss-eas-app-engineering.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "eric-oss-eas-app-engineering.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}


{{- define "get-application-version" -}}
  {{- $configMapObj := (lookup "v1" "ConfigMap" .Release.Namespace "eric-installed-applications") }}
  {{- $configData := (get $configMapObj.data "Installed") | fromYaml }}
  {{- range $configData.csar }}
    {{- if eq .name "eric-oss-ericsson-adaptation" }}
        {{ .version }}
    {{ end}}
  {{- end}}
{{- end}}

{{- define "get-product-version" -}}
  {{- $configMapObj := (lookup "v1" "ConfigMap" .Release.Namespace "eric-installed-applications") }}
  {{- $configData := (get $configMapObj.data "Installed") | fromYaml }}
  {{ $configData.helmfile.release }}
{{- end}}

{{- define "get-gas-host" -}}
  {{- $gasMapObj := lookup "v1" "ConfigMap" .Release.Namespace "testware-hostnames" | default dict }}
  {{- $gasData := (get $gasMapObj "data") | default dict }}
  {{- $gas := (get $gasData "gas") }}
  {{- if $gas }}
    {{- $gas }}
  {{- else }}
    {{- $specMapObj := lookup "networking.istio.io/v1beta1" "VirtualService" .Release.Namespace "eric-oss-common-base-gas-virtualservice" | default dict }}
    {{ with index $specMapObj "spec" }}
      {{ with index . "hosts" }}
        {{ range . }}
          {{ . }}  {{ end }}
      {{ else }}
      {{ end }}
    {{ else }}
    {{ end }}
  {{- end }}
{{- end }}

{{- define "get-iam-host" -}}
  {{- $iamMapObj := lookup "v1" "ConfigMap" .Release.Namespace "testware-hostnames" | default dict }}
  {{- $iamData := (get $iamMapObj "data") | default dict }}
  {{- $iam := (get $iamData "iam") }}
  {{- if $iam }}
    {{- $iam }}
  {{- else }}
    {{- $specMapObj := (lookup "networking.istio.io/v1beta1" "VirtualService" .Release.Namespace "eric-oss-ncmp-hub-addition-virtualservice") | default dict }}
    {{ with index $specMapObj "spec" }}
      {{ with index . "hosts" }}
        {{ range . }}
          {{ . }}  {{ end }}
      {{ else }}
      {{ end }}
    {{ else }}
    {{ end }}
  {{- end }}
{{- end }}

{{/*
Check messaging.kafka.tls.enabled
*/}}
{{- define "eric-oss-eas-app-engineering.kafka-tls-enabled" -}}
  {{- $kafkaTlsEnabled := "false" -}}
  {{- if  .Values.messaging -}}
    {{- if  .Values.messaging.kafka -}}
      {{- if  .Values.messaging.kafka.tls -}}
        {{- $kafkaTlsEnabled = .Values.messaging.kafka.tls.enabled -}}
      {{- end -}}
    {{- end -}}
  {{- end -}}
  {{- $kafkaTlsEnabled -}}
{{- end -}}

{{/*
Define kafka bootstrap server port
*/}}
{{- define "eric-oss-eas-app-engineering.kafka-bootstrap-server-port" -}}
  {{- $kafkaBootstrapServerPort := .Values.messaging.kafka.bootstrapServer.port -}}
  {{- if eq (include "eric-oss-eas-app-engineering.kafka-tls-enabled" .) "true" -}}
    {{- $kafkaBootstrapServerPort = .Values.messaging.kafka.bootstrapServer.tlsPort -}}
  {{- end -}}
  {{- $kafkaBootstrapServerPort -}}
{{- end -}}

{{/*
Define kafka tls secret
*/}}
{{- define "eric-oss-eas-app-engineering.kafka-tls-secret" -}}
  {{- $bootStrapServerHost := .Values.messaging.kafka.bootstrapServer.host -}}
  {{- if eq "eric-oss-dmm-kf-op-sz-kafka-bootstrap" $bootStrapServerHost }}
{{- include "eric-oss-eas-app-engineering.name" . }}-kf-secret
  {{- else }}
{{- include "eric-oss-eas-app-engineering.name" . }}-eric-data-message-bus-kf-secret
  {{- end -}}
{{- end -}}
