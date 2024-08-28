#!/bin/bash
KUBECONFIG=$1
NAMESPACE=$2
REPORT_PATH=$3

REPORT_NAME=''
if [ $# -gt 3 ] ; then
  REPORT_NAME="$4-"
fi

# Delete network policies and pod
function cleanup() {
  kubectl --namespace ${NAMESPACE} --kubeconfig ${KUBECONFIG} delete pod eas-k6-testsuite

  kubectl --namespace ${NAMESPACE} --kubeconfig ${KUBECONFIG} delete configmap/eas-k6-utility-configmap
  kubectl --namespace ${NAMESPACE} --kubeconfig ${KUBECONFIG} delete configmap/eas-k6-main-configmap
  kubectl --namespace ${NAMESPACE} --kubeconfig ${KUBECONFIG} delete configmap/eas-k6-functional-configmap
  kubectl --namespace ${NAMESPACE} --kubeconfig ${KUBECONFIG} delete configmap/eas-k6-gat-configmap
  kubectl --namespace ${NAMESPACE} --kubeconfig ${KUBECONFIG} delete configmap/eas-k6-characteristics-configmap
  kubectl --namespace ${NAMESPACE} --kubeconfig ${KUBECONFIG} delete configmap/eas-k6-non-functional-configmap
  kubectl --namespace ${NAMESPACE} --kubeconfig ${KUBECONFIG} delete configmap/eas-k6-constants-configmap
  kubectl --namespace ${NAMESPACE} --kubeconfig ${KUBECONFIG} delete configmap/eas-k6-certs-configmap
  kubectl --namespace ${NAMESPACE} --kubeconfig ${KUBECONFIG} delete configmap/eas-k6-nightly-configmap
  kubectl --namespace ${NAMESPACE} --kubeconfig ${KUBECONFIG} delete configmap/eas-k6-80k-configmap
  kubectl --namespace ${NAMESPACE} --kubeconfig ${KUBECONFIG} delete configmap/eas-k6-restsim-configmap

  kubectl --namespace ${NAMESPACE} --kubeconfig ${KUBECONFIG} delete networkpolicy/eric-eas-k6-ncmp-policy
  kubectl --namespace ${NAMESPACE} --kubeconfig ${KUBECONFIG} delete networkpolicy/eric-eas-k6-enm-notification-simulator-policy
  kubectl --namespace ${NAMESPACE} --kubeconfig ${KUBECONFIG} delete networkpolicy/eric-eas-k6-enmstub-policy
  kubectl --namespace ${NAMESPACE} --kubeconfig ${KUBECONFIG} delete networkpolicy/eric-eas-k6-subsys-policy
  kubectl --namespace ${NAMESPACE} --kubeconfig ${KUBECONFIG} delete networkpolicy/eric-eas-k6-enm-model-adapter-policy
  kubectl --namespace ${NAMESPACE} --kubeconfig ${KUBECONFIG} delete networkpolicy/eric-eas-k6-enm-discovery-adapter-policy
  kubectl --namespace ${NAMESPACE} --kubeconfig ${KUBECONFIG} delete networkpolicy/eric-eas-k6-eo-enm-adapter-policy
  kubectl --namespace ${NAMESPACE} --kubeconfig ${KUBECONFIG} delete networkpolicy/eric-eas-k6-cmn-topology-svc-core-policy
  kubectl --namespace ${NAMESPACE} --kubeconfig ${KUBECONFIG} delete networkpolicy/eric-eas-k6-ran-topology-adapter-policy
  kubectl --namespace ${NAMESPACE} --kubeconfig ${KUBECONFIG} delete networkpolicy/eric-eas-k6-enm-notification-adapter-policy
  kubectl --namespace ${NAMESPACE} --kubeconfig ${KUBECONFIG} delete networkpolicy/eric-eas-k6-restsim-policy-for-app-eng
  kubectl --namespace ${NAMESPACE} --kubeconfig ${KUBECONFIG} delete KafkaTopic/k6-batch
}

# Save pod log and test output
function saveLogs() {
  echo 'Saving pod logs and test-output.json for '
  kubectl --namespace ${NAMESPACE} --kubeconfig ${KUBECONFIG} cp eas-k6-testsuite:/reports/eas-test-output.json ${REPORT_PATH}/${REPORT_NAME}eas-test-output.json
  kubectl --namespace ${NAMESPACE} --kubeconfig ${KUBECONFIG} cp eas-k6-testsuite:/reports/summary.json ${REPORT_PATH}/${REPORT_NAME}summary.json
  kubectl --namespace ${NAMESPACE} --kubeconfig ${KUBECONFIG} logs eas-k6-testsuite > ${REPORT_PATH}/${REPORT_NAME}eas-k6-testsuite.log
}

# The below logic will try to fetch result.html from k6 pod.
# Note that result.html is only generated after test is completed, while test-output.json is updated continuously during test execution
# Will wait for at most 20 mins for the file to be generated.
retries="90";

echo retries:$retries
while [ $retries -ge 0 ]
do
  kubectl --namespace ${NAMESPACE} --kubeconfig ${KUBECONFIG} cp eas-k6-testsuite:/reports/eas-result.html ${REPORT_PATH}/${REPORT_NAME}eas-result.html > /dev/null
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