# How To execute App Staging tests locally

This document describes how you can run eas-k6 tests on your namespace.

## Prerequisites

A deployed namespace with:

- EAS
- CH
- TH (topology handling) / CTS (common topology service)

> **Note**:
> The tests are working against both minikube and hall clusters, both with minikube install script and install-adaptation-minimal.
> You can find these scripts in idun-common repository: https://gerrit-gamma.gic.ericsson.se/#/admin/projects/cerberus/OSS/idun-common

## Wrapper script

The wrapper script (`run_test.sh`) calls `deployEASK6Pod.sh` and after that `copyK6Report.sh`.

### Execute runner script

```
./eas-k6-functional/scripts/run_test.sh <KUBECONFIG> <NAMESPACE>
```

> **Note**:
> !! Execute script from repo root !!

Sample call:

```
./eas-k6-functional/scripts/run_test.sh ~/.kube/config groot-eas-ch
```

Wait for report to be generated and script to return.
After successful run, script can be executed again. It will remove the generated report and grab the new one.

## Alternative way to execute

### 1. Deploy K6 pod

Execute deploy script from repo root.
Required parameters are: `kubeconfig` and `namespace`.

```
sh ./eas-k6-functional/scripts/deployEASK6Pod-local.sh <KUBECONFIG_PATH> <NAMESPACE>
```

Sample call:

```
sh ./eas-k6-functional/scripts/deployEASK6Pod-local.sh ~/.kube/config groot-eas-ch
```

The script will return after deployment.
This will deploy the k6 pod to the namespace, the test sources are mounted in a ConfigMap and test will start inside the pod.

### 2. Execute script to grab result

Start script that grabs the report.
This watches the k6 pod for result files.
If they are present, it will copy them and delete the pod and related resources (network policies, config map etc).

Required parameters are: `kubeconfig`, `namespace`, `path to report file`, `eas/ch` based on executed test.

Sample call:

```
./eas-k6-functional/scripts/copyK6Report.sh ~/.kube/config groot-eas-ch . eas
```

In about 10-15 minutes, result will be grabbed to these files:

```
eas-k6-testsuite.log
eas-result.html
eas-test-output.json
```

> **Note**:
> If you want to re-run the tests, remove the local result files first:
> rm eas-k6-testsuite.log eas-result.html eas-test-output.json

### 3. Run curl command locally

If you only want to call a few endpoints instead of the full test, you can use a specific tool for this (Postman),
or the curl command after using port-forward. Postman collection can be found in the idun-common repository.

First of all need port-forward for that pod, which you wanna use.
Sample call for eric-eo-subsystem-management (create/list subsystems)

```
kubectl get service -n hall116-eric-eic-1 eric-eo-subsystem-management -o yaml | grep targetPort
kubectl -n hall116-eric-eic-1 port-forward eric-eo-subsystem-management-6c95ffbbc9-5h48n 8082:8080 &
curl --location 'localhost:8082/subsystem-manager/v1/subsystems' | jq
```

Body response for curl command:

```
[
  {
    "id": 2,
    "name": "enm-8281:eric-eo-enm-stub:80",
    "subsystemType": {
      "id": 1,
      "type": "DomainManager",
      "category": "Primary"
    },
    "healthCheckTime": "1h",
    "url": "http://eric-eo-enm-stub",
    "operationalState": "REACHABLE",
    "connectionProperties": [
      {
        "id": 3,
        "subsystemId": 2,
        "name": "connection1",
        "username": "administrator",
        "password": "TestPassw0rd",
        "encryptedKeys": [
          "password"
        ],
        "subsystemUsers": []
      }
    ],
    "vendor": "Ericsson",
    "subsystemTypeId": 1,
    "adapterLink": "eric-eo-enm-adapter"
  }
]
```

## Start app engineering test with helm install

### 1. Download latest eric-oss-eas-app-engineering helm chart

From here: https://arm.seli.gic.ericsson.se/artifactory/proj-eric-oss-drop-helm-local/oss-testware/eric-oss-eas-app-engineering/

### 2. Setup your kubeconfig

The kubeconfig should be set for that cluster where you wanna run our test

### 3. Set the variables for helm install

```
<NAMESPACE>=<your_namespace>
<BUILD_URL>=something
<APP_VERSION>=`helm list -n <NAMESPACE> --filter eric-oss-ericsson-adaptation -o json | jq -r '.[0].chart' | cut -d '-' -f5`
<HELM_ENV_VAL>=`helm get values eric-oss-ericsson-adaptation -n <NAMESPACE> -o json`
<GAS_HOST>=`echo <HELM_ENV_VAL> | python3 -c "import sys, json; print(json.load(sys.stdin)['global']['hosts']['gas'])"`
```

### 4. Run helm install command with parameters

For base app staging:

```
helm install eric-oss-eas-app-engineering eric-oss-eas-app-engineering-<ver>.tgz  -n <NAMESPACE> --set env.BUILD_URL=<BUILD_URL> --set env.APP_VERSION=<APP_VERSION> --set env.GAS_HOST_FROM_DEPLOY_SH=<GAS_HOST>
```

For ps characteristics test:

```
helm install eric-oss-eas-app-engineering eric-oss-eas-app-engineering-<ver>.tgz  -n <NAMESPACE> --set env.BUILD_URL=<BUILD_URL> --set env.APP_VERSION=<APP_VERSION> --set env.GAS_HOST_FROM_DEPLOY_SH=<GAS_HOST> --set env.OPTIONS_FILE='ps.options.json'
```

For 30k and 50k restsim install:
You need to give a preinstalled restsim url for 30k and for 50k too.

```
helm install eric-oss-eas-app-engineering eric-oss-eas-app-engineering-<ver>.tgz  -n <NAMESPACE> --set env.BUILD_URL=<BUILD_URL> --set env.APP_VERSION=<APP_VERSION> --set env.GAS_HOST_FROM_DEPLOY_SH=<GAS_HOST> --set env.OPTIONS_FILE='ps_tmo.options.json' --set env.RESTSIM_URL1='http://eric-oss-restsim-release.hart147-eric-eic-3.svc.cluster.local' --set env.RESTSIM_URL2='http://eric-oss-restsim-release.hart147-eric-eic-4.svc.cluster.local'
```
