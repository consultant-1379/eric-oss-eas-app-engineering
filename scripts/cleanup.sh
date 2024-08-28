#!/bin/bash

KUBECONFIG=$1
NAMESPACE=$2

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

  kubectl --namespace ${NAMESPACE} --kubeconfig ${KUBECONFIG} delete networkpolicy/eric-eas-k6-enm-notification-simulator-policy
  kubectl --namespace ${NAMESPACE} --kubeconfig ${KUBECONFIG} delete networkpolicy/eric-eas-k6-enmstub-policy
  kubectl --namespace ${NAMESPACE} --kubeconfig ${KUBECONFIG} delete networkpolicy/eric-eas-k6-subsys-policy
  kubectl --namespace ${NAMESPACE} --kubeconfig ${KUBECONFIG} delete networkpolicy/eric-eas-k6-ncmp-policy
  kubectl --namespace ${NAMESPACE} --kubeconfig ${KUBECONFIG} delete networkpolicy/eric-eas-k6-enm-model-adapter-policy
  kubectl --namespace ${NAMESPACE} --kubeconfig ${KUBECONFIG} delete networkpolicy/eric-eas-k6-enm-discovery-adapter-policy
  kubectl --namespace ${NAMESPACE} --kubeconfig ${KUBECONFIG} delete networkpolicy/eric-eas-k6-eo-enm-adapter-policy
  kubectl --namespace ${NAMESPACE} --kubeconfig ${KUBECONFIG} delete networkpolicy/eric-eas-k6-cmn-topology-svc-core-policy
  kubectl --namespace ${NAMESPACE} --kubeconfig ${KUBECONFIG} delete networkpolicy/eric-eas-k6-ran-topology-adapter-policy
  kubectl --namespace ${NAMESPACE} --kubeconfig ${KUBECONFIG} delete networkpolicy/eric-eas-k6-enm-notification-adapter-policy
  kubectl --namespace ${NAMESPACE} --kubeconfig ${KUBECONFIG} delete networkpolicy/eric-eas-k6-restsim-policy-for-app-eng
  kubectl --namespace ${NAMESPACE} --kubeconfig ${KUBECONFIG} delete KafkaTopic/k6-batch
}

cleanup