#!/bin/bash
KUBECONFIG=$1
NAMESPACE=$2
CHAR_TEST_TYPE=$3
ENM_HOSTNAME=$4
OPTIONS_FILE=$5
USE_SEF=$6

HELM_ENV_VAL=`helm get values eric-oss-config-handling --kubeconfig ${KUBECONFIG} -n ${NAMESPACE} -o json`
GAS_HOST=`echo $HELM_ENV_VAL | python3 -c "import sys, json; print(json.load(sys.stdin)['global']['hosts']['gas'])"`
IAM_HOST=`echo $HELM_ENV_VAL | python3 -c "import sys, json; print(json.load(sys.stdin)['global']['hosts']['iam'])"`
DISCOVERY_NODE_TYPES=$(kubectl get deployment --kubeconfig ${KUBECONFIG} -n ${NAMESPACE} eric-oss-enm-discovery-adapter -o jsonpath='{.spec.template.spec.containers[0].env[?(@.name=="DISCOVERY_NODE_TYPES")].value}' | sed 's/[ ,]/_/g')
KAFKA_BOOTSTRAP_SERVER_HOST="eric-oss-dmm-kf-op-sz-kafka-bootstrap"
KAFKA_BOOTSTRAP_SERVER_PORT="9092"

kubectl --namespace ${NAMESPACE} --kubeconfig ${KUBECONFIG} create configmap eas-k6-constants-configmap \
  --from-literal=GAS_HOST=${GAS_HOST} \
  --from-literal=IAM_HOST=${IAM_HOST} \
  --from-literal=TH_DISABLED=${TH_DISABLED} \
  --from-literal=DISCOVERY_NODE_TYPES=${DISCOVERY_NODE_TYPES} \
  --from-literal=CHAR_TEST_TYPE=${CHAR_TEST_TYPE} \
  --from-literal=OPTIONS_FILE=${OPTIONS_FILE} \
  --from-literal=ENM_HOSTNAME=${ENM_HOSTNAME} \
  --from-literal=KAFKA_BOOTSTRAP_SERVER_HOST=${KAFKA_BOOTSTRAP_SERVER_HOST} \
  --from-literal=KAFKA_BOOTSTRAP_SERVER_PORT=${KAFKA_BOOTSTRAP_SERVER_PORT} \
  --from-literal=USE_SEF=${USE_SEF}

kubectl --namespace ${NAMESPACE} --kubeconfig ${KUBECONFIG} create configmap eas-k6-utility-configmap \
  --from-file=eas-const=./src/js/utility/constants.js \
  --from-file=eas-hash=./src/js/utility/hash.js \
  --from-file=eas-utility=./src/js/utility/utility.js \
  --from-file=eas-describe=./src/js/utility/describe.js \
  --from-file=eas-ajv=./src/js/utility/ajv.js \
  --from-file=eas-auth=./src/js/utility/auth.js \
  --from-file=eas-kafka=./src/js/utility/kafka.js

kubectl --namespace ${NAMESPACE} --kubeconfig ${KUBECONFIG} create configmap eas-k6-main-configmap \
  --from-file=eas-main=./src/js/main.js \
  --from-file=char-main=./src/js/characteristicsTests.js \
  --from-file=char-sh=./scripts/runK6EASChar.sh

kubectl --namespace ${NAMESPACE} --kubeconfig ${KUBECONFIG} create configmap eas-k6-functional-configmap \
  --from-file=eas-t4=./src/js/use-cases/Functional/EAS_4.js \
  --from-file=eas-t5=./src/js/use-cases/Functional/EAS_5.js \
  --from-file=eas-t6=./src/js/use-cases/Functional/EAS_6.js \
  --from-file=eas-t7=./src/js/use-cases/Functional/EAS_7.js \
  --from-file=eas-t8=./src/js/use-cases/Functional/EAS_8.js \
  --from-file=eas-t9=./src/js/use-cases/Functional/EAS_9.js \
  --from-file=eas-t10=./src/js/use-cases/Functional/EAS_10.js \
  --from-file=eas-t11=./src/js/use-cases/Functional/EAS_11.js \
  --from-file=eas-t12=./src/js/use-cases/Functional/EAS_12.js \
  --from-file=eas-t13=./src/js/use-cases/Functional/EAS_13.js \
  --from-file=eas-t14=./src/js/use-cases/Functional/EAS_14.js \
  --from-file=eas-t15=./src/js/use-cases/Functional/EAS_15.js \
  --from-file=eas-t16=./src/js/use-cases/Functional/EAS_16.js \
  --from-file=eas-t17=./src/js/use-cases/Functional/EAS_17.js \
  --from-file=eas-t18=./src/js/use-cases/Functional/EAS_18.js \
  --from-file=eas-t19=./src/js/use-cases/Functional/EAS_19.js \
  --from-file=eas-t20=./src/js/use-cases/Functional/EAS_20.js \
  --from-file=eas-events=./src/js/use-cases/Functional/eventPolling.js \
  --from-file=eas-events-restsim=./src/js/use-cases/Functional/eventPolling_restsim.js \
  --from-file=eas-ncmp-roles-test=./src/js/use-cases/Functional/ncmpRolesTests.js

kubectl --namespace ${NAMESPACE} --kubeconfig ${KUBECONFIG} create configmap eas-k6-gat-configmap \
  --from-file=eas-gat-1=./src/js/use-cases/GAT/Gat_3_1.js \
  --from-file=eas-gat-2=./src/js/use-cases/GAT/Gat_3_2.js \
  --from-file=eas-gat-3=./src/js/use-cases/GAT/Gat_3_3.js \
  --from-file=eas-gat-4=./src/js/use-cases/GAT/Gat_3_4.js \
  --from-file=eas-gat-5=./src/js/use-cases/GAT/Gat_3_5.js \
  --from-file=eas-gat-cleanup=./src/js/use-cases/GAT/Gat_Cleanup.js

kubectl --namespace ${NAMESPACE} --kubeconfig ${KUBECONFIG} create configmap eas-k6-characteristics-configmap \
  --from-file=char-crud-ops=./src/js/use-cases/Characteristics/CRUDOperationsChar.js \
  --from-file=char-utils=./src/js/use-cases/Characteristics/charutils.js \
  --from-file=char-batch-flow=./src/js/use-cases/Characteristics/batchFlow.js \
  --from-file=char-crud-flow=./src/js/use-cases/Characteristics/crudFlow.js \
  --from-file=char-crud-enm-flow=./src/js/use-cases/Characteristics/crudFlowENM.js \
  --from-file=char-deregister-flow=./src/js/use-cases/Characteristics/deregisterFlow.js \
  --from-file=char-discovery-flow=./src/js/use-cases/Characteristics/discoveryFlow.js \
  --from-file=char-searches-flow=./src/js/use-cases/Characteristics/searchesFlow.js

kubectl --namespace ${NAMESPACE} --kubeconfig ${KUBECONFIG} create configmap eas-k6-non-functional-configmap \
  --from-file=crud-ops=./src/js/use-cases/Non-Functional/CRUDOperations.js \
  --from-file=crud-base=./src/js/use-cases/Non-Functional/CRUDBase.js \
  --from-file=eas-model-adapter-metrics=./src/js/use-cases/Non-Functional/ENMModelAdapterMetrics.js \
  --from-file=eas-notif-adapter-metrics=./src/js/use-cases/Non-Functional/ENMNotificationAdapterMetrics.js

kubectl --namespace ${NAMESPACE} --kubeconfig ${KUBECONFIG} create configmap eas-k6-certs-configmap \
  --from-file=cert-80k=./scripts/enm_certs/enmcnis-n297p1.sero.gic.ericsson.se.txt \
  --from-file=cert-nightly=./scripts/enm_certs/stsossflexcenm2001-36598.stsoss.seli.gic.ericsson.se.txt

kubectl --namespace ${NAMESPACE} --kubeconfig ${KUBECONFIG} create configmap eas-k6-nightly-configmap \
  --from-file=nightly-opts-crud-1=./src/resources/config/char/crud/ncmp/nightly/create.crud.options.json \
  --from-file=nightly-opts-crud-2=./src/resources/config/char/crud/ncmp/nightly/read.nrcell.crud.options.json \
  --from-file=nightly-opts-crud-3=./src/resources/config/char/crud/ncmp/nightly/read.dufunction.crud.options.json \
  --from-file=nightly-opts-crud-4=./src/resources/config/char/crud/ncmp/nightly/update.crud.options.json \
  --from-file=nightly-opts-crud-5=./src/resources/config/char/crud/ncmp/nightly/delete.crud.options.json \
  --from-file=nightly-opts-crud=./src/resources/config/char/nightly/nightly.crud.options.json \
  --from-file=nightly-opts-disco=./src/resources/config/char/nightly/nightly.options.json \
  --from-file=nightly-opts-dereg=./src/resources/config/char/nightly/nightly.deregistration.options.json \
  --from-file=nightly-opts-events=./src/resources/config/char/nightly/nightly.events.options.json \
  --from-file=nightly-opts-batch=./src/resources/config/char/nightly/nightly.batch.options.json \
  --from-file=enm-opts-cleanup=./src/resources/config/char/crud/enm/cleanup.crud.options.json

kubectl --namespace ${NAMESPACE} --kubeconfig ${KUBECONFIG} create configmap eas-k6-80k-configmap \
  --from-file=80k-opts-crud-1=./src/resources/config/char/crud/ncmp/80k/create.crud.options.json \
  --from-file=80k-opts-crud-2=./src/resources/config/char/crud/ncmp/80k/read.nrcell.crud.options.json \
  --from-file=80k-opts-crud-3=./src/resources/config/char/crud/ncmp/80k/read.dufunction.crud.options.json \
  --from-file=80k-opts-crud-4=./src/resources/config/char/crud/ncmp/80k/update.crud.options.json \
  --from-file=80k-opts-crud-5=./src/resources/config/char/crud/ncmp/80k/delete.crud.options.json \
  --from-file=80k-opts-crud=./src/resources/config/char/80k/80k.crud.options.json \
  --from-file=80k-opts-batch=./src/resources/config/char/80k/80k.batch.options.json \
  --from-file=80k-opts-searches=./src/resources/config/char/80k/80k.searches.options.json \
  --from-file=80k-opts-disco=./src/resources/config/char/80k/80k.options.json \
  --from-file=80k-opts-dereg=./src/resources/config/char/80k/80k.deregistration.options.json \
  --from-file=enm-opts-cleanup=./src/resources/config/char/crud/enm/cleanup.crud.options.json

kubectl --namespace ${NAMESPACE} --kubeconfig ${KUBECONFIG} create configmap eas-k6-restsim-configmap \
  --from-file=restsim-opts-crud=./src/resources/config/char/restsim/restsim.crud.options.json \
  --from-file=restsim-opts-disco=./src/resources/config/char/restsim/restsim.options.json \
  --from-file=restsim-opts-searches=./src/resources/config/char/restsim/restsim.searches.options.json \
  --from-file=restsim-opts-batch=./src/resources/config/char/restsim/restsim.batch.options.json \
  --from-file=restsim-opts-dereg=./src/resources/config/char/restsim/restsim.deregistration.options.json \
  --from-file=enm-opts-cleanup=./src/resources/config/char/crud/enm/cleanup.crud.options.json

kubectl --namespace ${NAMESPACE} --kubeconfig ${KUBECONFIG} apply -f charts/kafka/KafkaTopic.yaml;
kubectl --namespace ${NAMESPACE} --kubeconfig ${KUBECONFIG} apply -f charts/network-policy/eric-eas-k6-enm-notification-simulator-policy.yaml;
kubectl --namespace ${NAMESPACE} --kubeconfig ${KUBECONFIG} apply -f charts/network-policy/eric-eas-k6-enmstub-policy.yaml;
kubectl --namespace ${NAMESPACE} --kubeconfig ${KUBECONFIG} apply -f charts/network-policy/eric-eas-k6-ncmp-policy.yaml;
kubectl --namespace ${NAMESPACE} --kubeconfig ${KUBECONFIG} apply -f charts/network-policy/eric-eas-k6-subsys-policy.yaml;
kubectl --namespace ${NAMESPACE} --kubeconfig ${KUBECONFIG} apply -f charts/network-policy/eric-eas-k6-enm-model-adapter-policy.yaml;
kubectl --namespace ${NAMESPACE} --kubeconfig ${KUBECONFIG} apply -f charts/network-policy/eric-eas-k6-enm-discovery-adapter-policy.yaml;
kubectl --namespace ${NAMESPACE} --kubeconfig ${KUBECONFIG} apply -f charts/network-policy/eric-eas-k6-eo-enm-policy.yaml;
kubectl --namespace ${NAMESPACE} --kubeconfig ${KUBECONFIG} apply -f charts/network-policy/eric-eas-k6-cmn-topology-svc-core-policy.yaml;
kubectl --namespace ${NAMESPACE} --kubeconfig ${KUBECONFIG} apply -f charts/network-policy/eric-eas-k6-eric-oss-ran-topology-adapter-policy.yaml;
kubectl --namespace ${NAMESPACE} --kubeconfig ${KUBECONFIG} apply -f charts/network-policy/eric-eas-k6-enm-notification-adapter-policy.yaml;
kubectl --namespace ${NAMESPACE} --kubeconfig ${KUBECONFIG} apply -f charts/network-policy/eric-eas-k6-restsim-policy.yaml;
kubectl --namespace ${NAMESPACE} --kubeconfig ${KUBECONFIG} apply -f charts/eas-k6podchar-local.yaml;
