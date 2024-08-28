#!/bin/bash
KUBECONFIG=$1
NAMESPACE=$2

array=(
    "eric-oss-ncmp"
    "eric-eo-enm-adapter"
    "eric-oss-ran-topology-adapter"
    "eric-oss-enm-notification-adapter"
    "eric-oss-enm-model-adapter"
    "eric-oss-enm-discovery-adapter"
    "eric-oss-top-inv-exposure"
)

# echo "Start makePodLogs.sh: $(date)"
mkdir -p tempFolder
errorCode=$?
if ! [ -e tempFolder ]; then
    echo "tempFolder not created"
    echo "tempFolder error code: ${errorCode}"
    exit -1
else
    echo "tempFolder created"
fi

# create logs and list of pod` names into txt files
for POD in ${array[*]}; do
    namesWithHash=`kubectl --kubeconfig ${KUBECONFIG} --namespace ${NAMESPACE} get pods --selector=app.kubernetes.io/name=${POD} --output jsonpath='{.items[*].metadata.name}'`
    namesWithHash=($namesWithHash)

    j=0
    # there might be more pods with same name - different hash
    # 'j' number concatenated in pod log file`s name then the hash, so 'i' is not used only for iterating
    for i in "${namesWithHash[@]}"; do
        kubectl --kubeconfig ${KUBECONFIG} --namespace ${NAMESPACE} logs ${namesWithHash[j]} -f > tempFolder/${POD}-${j}.log &
        errorCode=$?
        if [[ $errorCode -ne 0 ]]; then
            echo "Errorcode: ${errorCode}"
            exit -1
        fi
        pid=$!
        echo "[$pid] ${i} > ${POD}-${j}.log"
        let "j+=1"
        sleep 2h && kill "$pid" &  # kill the process after 2 hours
    done
done
# echo "Finish makePodLogs.sh: $(date)"
