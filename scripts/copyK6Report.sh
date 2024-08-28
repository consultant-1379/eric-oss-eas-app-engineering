#!/bin/bash
KUBECONFIG=$1
NAMESPACE=$2
REPORT_PATH=$3
GEN_RESP=`kubectl get deployment -n ${NAMESPACE} eric-eo-enm-stub-for-app-eng -o jsonpath='{.spec.template.spec.containers[].env[?(@.name=="GENERATE_RESPONSES")].value}'`
GEN_VALUE=`kubectl get deployment -n ${NAMESPACE} eric-eo-enm-stub-for-app-eng -o jsonpath='{.spec.template.spec.containers[].env[?(@.name=="GENERATED_QUANTITY")].value}'`

REPORT_NAME=''
if [ $# -gt 3 ] ; then
  REPORT_NAME="$4-"
fi

# Delete network policies and pod
function cleanup() {
  check_container_status() {
    local timeout=300
    local end_time=$((SECONDS + timeout))

    while [ $SECONDS -lt $end_time ]; do
      local container_status=$(kubectl get pod eric-oss-eas-app-engineering -n ${NAMESPACE} -o jsonpath="{.status.containerStatuses[?(@.name=='eric-oss-eas-app-engineering')].state.terminated}")
      if [ -n "$container_status" ]; then
        kubectl --namespace ${NAMESPACE} --kubeconfig ${KUBECONFIG} logs eric-oss-eas-app-engineering > ${REPORT_PATH}/${REPORT_NAME}eric-oss-eas-app-engineering.log
        return 0
      fi
      echo "Waiting for container eric-oss-eas-app-engineering within pod eric-oss-eas-app-engineering to be Terminated..."
      sleep 20
    done

    return 1
  }

  if check_container_status; then
    echo "Container eric-oss-eas-app-engineering is in Terminated state. Deleting the helm chart..."
    helm delete eric-oss-eas-app-engineering -n ${NAMESPACE}
  else
    echo "Timeout: Container eric-oss-eas-app-engineering did not reach Terminated state within the specified timeout. (5 min)"
  fi
}

# Save pod log and test output
function saveLogs() {
  echo 'Saving pod logs and summary.json'
  kubectl --namespace ${NAMESPACE} --kubeconfig ${KUBECONFIG} cp eric-oss-eas-app-engineering:/reports/summary.json ${REPORT_PATH}/${REPORT_NAME}summary.json
}

# The below logic will try to fetch result.html from k6 pod.
# Note that result.html is only generated after test is completed, while test-output.json is updated continuously during test execution
# Will wait for at most 20 mins for the file to be generated.
if [[ $GEN_RESP == "true" && $GEN_VALUE -gt 100 ]]; then
  retries="600";
else
  retries="120";
fi
echo retries:$retries
while [ $retries -ge 0 ]
do
  kubectl --namespace ${NAMESPACE} --kubeconfig ${KUBECONFIG} cp eric-oss-eas-app-engineering:/reports/eas-result.html ${REPORT_PATH}/${REPORT_NAME}eas-result.html > /dev/null
  stat ${REPORT_PATH}/${REPORT_NAME}eas-result.html 2> /dev/null
  ResultFound=$?
  if [ $ResultFound -eq 0 ]; then
    echo 'HTML report for 'eas' downloaded.'
    break;
  else
    echo 'Test report file for 'eas' not yet available, Retries left =' $retries;
    sleep 60 # sleep 60 seconds
    let "retries-=1";
  fi
done

# Logs and cleanup is executed even if report is not present
saveLogs
cleanup