# How To execute App Staging tests locally

This document describes how you can run eas-k6 tests on your namespace.

## Prerequisites

A deployed namespace with:

- EAS
- CH
- TH (topology handling) / CTS (common topology service)

> **Note**:  
> The tests are working against both minikube and hall clusters, both with minikube install script and install-adaptation-minimal.

## Wrapper script

The wrapper script (`run_test.sh`) calls `deployEASK6Pod.sh` and after that `copyK6Report.sh`.

### Execute wrapper script

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
