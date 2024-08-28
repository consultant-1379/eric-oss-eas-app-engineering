#!/bin/bash
KUBECONFIG=$1
NAMESPACE=$2
BUILD_URL=$3
HELM_ENV_VAL=`helm get values eric-oss-config-handling -n ${NAMESPACE} -o json`
APP_VERSION=`helm list -n ${NAMESPACE} --filter eric-oss-ericsson-adaptation -o json | jq -r '.[0].chart' | cut -d '-' -f5`
GAS_HOST=`echo $HELM_ENV_VAL | python3 -c "import sys, json; print(json.load(sys.stdin)['global']['hosts']['gas'])"`
IAM_HOST=`echo $HELM_ENV_VAL | python3 -c "import sys, json; print(json.load(sys.stdin)['global']['hosts']['iam'])"`

if helm repo list | grep -q "^testware-repository\s"; then
    echo "Repository testware-repository already exists. Updating..."
    helm repo update testware-repository
else
    echo "Repository testware-repository does not exist. Adding..."
    helm repo add testware-repository https://arm.seli.gic.ericsson.se/artifactory/proj-eric-oss-drop-helm-local --username testautoci --password '&SmgE!!RJ87joL7T'
fi

helm install eric-oss-eas-app-engineering testware-repository/eric-oss-eas-app-engineering -n ${NAMESPACE} --kubeconfig ${KUBECONFIG} --set env.BUILD_URL=${BUILD_URL} --set env.APP_VERSION=${APP_VERSION} --set env.GAS_HOST_FROM_DEPLOY_SH=${GAS_HOST} --set env.IAM_HOST=${IAM_HOST}