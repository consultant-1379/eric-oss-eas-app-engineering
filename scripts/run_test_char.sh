#!/bin/bash

# This script will deploy the K6 pod and grab the test report
# run this script from repo root:
# ./eas-k6-functional/scripts/run_test_char.sh <KUBECONFIG> <NAMESPACE> <CHAR_TEST_TYPE> <ENM_HOSTNAME>

KUBECONFIG=$1
NAMESPACE=$2
CHAR_TEST_TYPE=$3
ENM_HOSTNAME=$4

USE_SEF=true

DISCO=false
CRUD=true
DEREG=false

TESTS=""

timestamp=`date +"%s"`

##DISCO
if [[ $DISCO == true ]]; then
  echo "##################################################"
  echo "####            DISCOVERY STAGE               ####"
  echo "##################################################"
  TESTS="${TESTS}discovery"
  OPTIONS_FILE="resources/config/char/$CHAR_TEST_TYPE/$CHAR_TEST_TYPE"
  #./scripts/cacert.sh ${KUBECONFIG} ${NAMESPACE} ${ENM_HOSTNAME}

  ./scripts/deployEASK6PodChar-local.sh ${KUBECONFIG} ${NAMESPACE} ${CHAR_TEST_TYPE} ${ENM_HOSTNAME} "${OPTIONS_FILE}.options.json" ${USE_SEF}

  ./scripts/copyK6Report-local.sh ${KUBECONFIG} ${NAMESPACE} . "${CHAR_TEST_TYPE}-discovery-${timestamp}"
  echo "Sleeping for 30 seconds after discovery..."
  sleep 30
fi

##CRUD
if [[ $CRUD == true ]]; then
  #operations=("crud" "cleanup")
#  operations=("batch")
  operations=("crud")
  #operations=("create" "read" "update" "delete" "cleanup")
#  operations=("searches")
  for i in {1..1}; do
    for operation in ${operations[@]}; do
      #OPTIONS_FILE="resources/config/char/$CHAR_TEST_TYPE/$operation"
      OPTIONS_FILE="resources/config/char/$CHAR_TEST_TYPE/$CHAR_TEST_TYPE"
      if [[ $operation == "cleanup" ]]; then
        OPTIONS_FILE="resources/config/char/$CHAR_TEST_TYPE/cleanup"
      fi
      if [[ $operation == "read" ]]; then
        OPTIONS_FILE="resources/config/char/$CHAR_TEST_TYPE/$operation.nrcell"
        #OPTIONS_FILE="resources/config/$CHAR_TEST_TYPE/$operation.dufunction"
      fi
      echo "##################################################"
      echo "                $operation STAGE - $i             "
      echo "##################################################"
      TESTS="${TESTS}-crud"
      ./scripts/deployEASK6PodChar-local.sh ${KUBECONFIG} ${NAMESPACE} ${CHAR_TEST_TYPE} ${ENM_HOSTNAME} "${OPTIONS_FILE}.crud.options.json" ${USE_SEF}
#      ./scripts/deployEASK6PodChar-local.sh ${KUBECONFIG} ${NAMESPACE} ${CHAR_TEST_TYPE} ${ENM_HOSTNAME} "${OPTIONS_FILE}.batch.options.json" ${USE_SEF}
#      ./scripts/deployEASK6PodChar-local.sh ${KUBECONFIG} ${NAMESPACE} ${CHAR_TEST_TYPE} ${ENM_HOSTNAME} "${OPTIONS_FILE}.searches.options.json" ${USE_SEF}

      ./scripts/copyK6Report-local.sh ${KUBECONFIG} ${NAMESPACE} . "$operation-$i-$timestamp"
      echo "Sleeping for 30 seconds after $operation-$i..."
      sleep 30
    done
  done
fi

##DEREGISTRATION
if [[ $DEREG == true ]]; then
  echo "##################################################"
  echo "####           DEREGISTRATION STAGE           ####"
  echo "##################################################"
  TESTS="${TESTS}-deregistration"
  OPTIONS_FILE="resources/config/char/$CHAR_TEST_TYPE/$CHAR_TEST_TYPE"
  #./scripts/cacert.sh ${KUBECONFIG} ${NAMESPACE} ${ENM_HOSTNAME}

  ./scripts/deployEASK6PodChar-local.sh ${KUBECONFIG} ${NAMESPACE} ${CHAR_TEST_TYPE} ${ENM_HOSTNAME} "${OPTIONS_FILE}.deregistration.options.json" ${USE_SEF}

  ./scripts/copyK6Report-local.sh ${KUBECONFIG} ${NAMESPACE} . "${CHAR_TEST_TYPE}-deregistration"
fi

python3 -u ./scripts/verifyResultsChar.py ${CHAR_TEST_TYPE} ${TESTS}

dirname="char_logs_$timestamp"
mkdir -p $dirname
errorCode=$?
if ! [ -e $dirname ]; then
    echo "char_logs not created"
    echo "char_logs error code: ${errorCode}"
    exit -1
else
    echo "char_logs created"
fi

cp -r *-summary.json $dirname/
cp -r *-eas-k6-testsuite.log $dirname/
cp -r *-eas-result.html $dirname/
cp -r *-eas-test-output.json $dirname/
cp -r char_results.json $dirname/

zip -r $dirname.zip $dirname/

rm *-summary.json
rm *-eas-k6-testsuite.log
rm *-eas-result.html
rm *-eas-test-output.json
rm char_results.json

