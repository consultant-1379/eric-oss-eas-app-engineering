#!/bin/bash
KUBECONFIG=$1
NAMESPACE=$2
BUILD_URL=$3
RESTSIM_URL=$4
OPTIONS_FILE=$5

if helm repo list | grep -q "^testware-repository\s"; then
    echo "Repository testware-repository already exists. Updating..."
    helm repo update testware-repository
else
    echo "Repository testware-repository does not exist. Adding..."
    helm repo add testware-repository https://arm.seli.gic.ericsson.se/artifactory/proj-eric-oss-drop-helm-local --username testautoci --password '&SmgE!!RJ87joL7T'
fi

helm install eric-oss-eas-app-engineering testware-repository/eric-oss-eas-app-engineering -n ${NAMESPACE} --kubeconfig ${KUBECONFIG} --set env.BUILD_URL=${BUILD_URL} --set env.RESTSIM_URL1=${RESTSIM_URL} --set env.OPTIONS_FILE=${OPTIONS_FILE}
