#!/bin/bash
namespace=hart146-eric-eic-1
rm -rf clicert.pem; rm -rf cliprivkey.pem; rm -rf keystore*; rm -rf ca.crt; rm -rf client.truststore
kubectl get secret eric-oss-ncmp-kf-secret -n $namespace -o jsonpath='{.data.cert\.pem}'| base64 -d  > clicert.pem
kubectl get secret eric-oss-ncmp-kf-secret -n $namespace -o jsonpath='{.data.key\.pem}'| base64 -d  > cliprivkey.pem

openssl pkcs12 -export -inkey cliprivkey.pem -in clicert.pem -out keystore.pkcs12 -password pass:password &&  keytool -importkeystore -noprompt -srckeystore keystore.pkcs12 -srcstoretype pkcs12  -destkeystore keystore.jks -storepass password -srcstorepass password

kubectl get secret eric-oss-dmm-kf-op-sz-kafka-root-cert -n $namespace -o jsonpath='{.data.srvcert\.crt}'| base64 -d  > ca.crt

keytool -import -alias rootCA -file ca.crt -storetype JKS -keystore client.truststore -keypass password -storepass password -noprompt #This would generate truststore, please provide password , and type yes for trustedcertificate.

kubectl cp client.truststore eric-oss-dmm-kf-op-sz-kafka-0:/tmp -n $namespace
kubectl cp keystore.jks eric-oss-dmm-kf-op-sz-kafka-0:/tmp -n $namespace
kubectl cp sslconfig.properties eric-oss-dmm-kf-op-sz-kafka-0:/tmp -n $namespace

kubectl exec -n $namespace eric-oss-dmm-kf-op-sz-kafka-0 -- /opt/kafka/bin/kafka-topics.sh --list --bootstrap-server localhost:9093 --command-config /tmp/sslconfig.properties
#kubectl exec -n $namespace eric-oss-dmm-kf-op-sz-kafka-0 -- /opt/kafka/bin/kafka-console-consumer.sh --bootstrap-server localhost:9093 --consumer.config=/tmp/sslconfig.properties --topic ncmp-async-m2m --from-beginning --property print.timestamp=true
#kubectl exec -n $namespace eric-oss-dmm-kf-op-sz-kafka-0 -- /opt/kafka/bin/kafka-console-consumer.sh --bootstrap-server localhost:9093 --consumer.config=/tmp/sslconfig.properties --topic rta-bulk-query-events --from-beginning --property print.timestamp=true | tee -a rta-bulk-query-events.log
