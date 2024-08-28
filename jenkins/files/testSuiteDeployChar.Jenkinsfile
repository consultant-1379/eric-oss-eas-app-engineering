#!/usr/bin/env groovy
/* IMPORTANT:
 *
 * In order to make this pipeline work, the following configuration on Jenkins is required:
 * - slave with a specific label (see pipeline.agent.label below)
 */

def defaultBobImage = 'armdocker.rnd.ericsson.se/proj-adp-cicd-drop/bob.2.0:1.7.0-55'
def ruleset = 'charts/ruleset2.0.yaml'
def bob = new BobCommand()
        .bobImage(defaultBobImage)
        .envVars([
                HOME:'${HOME}',
                ISO_VERSION:'${ISO_VERSION}',
                RELEASE:'${RELEASE}',
                SONAR_HOST_URL:'${SONAR_HOST_URL}',
                SONAR_AUTH_TOKEN:'${SONAR_AUTH_TOKEN}',
                GERRIT_CHANGE_NUMBER:'${GERRIT_CHANGE_NUMBER}',
                KUBECONFIG:'${KUBECONFIG_FILE}',
                NAMESPACE: '${NAMESPACE}',
                USER:'${USER}',
                SELI_ARTIFACTORY_REPO_USER:'${CREDENTIALS_SELI_ARTIFACTORY_USR}',
                SELI_ARTIFACTORY_REPO_PASS:'${CREDENTIALS_SELI_ARTIFACTORY_PSW}',
                SERO_ARTIFACTORY_REPO_USER:'${CREDENTIALS_SERO_ARTIFACTORY_USR}',
                SERO_ARTIFACTORY_REPO_PASS:'${CREDENTIALS_SERO_ARTIFACTORY_PSW}',
                MAVEN_CLI_OPTS: '${MAVEN_CLI_OPTS}',
                OPEN_API_SPEC_DIRECTORY: '${OPEN_API_SPEC_DIRECTORY}'
        ])
        .needDockerSocket(true)
        .toString()
def testVersion
pipeline {
    agent {
        label params.AGENT_LABEL
    }
    parameters {
        string(name: 'ENM_HOSTNAME',
                defaultValue: 'stsossflexcenm2001-36598.stsoss.seli.gic.ericsson.se',
                description: 'Hostname of the ENM to be used')
        string(name: 'ARMDOCKER_USER_SECRET',
                description: 'ARM Docker secret')
        string(name: 'NAMESPACE',
                description: 'Namespace to execute the test against' )
        string(name: 'KUBECONFIG_FILE',
                description: 'Kubernetes configuration file to specify which environment to install on' )
        string(name: 'AGENT_LABEL',
                defaultValue: 'evo_docker_engine',
                description: 'Label of agent which be used')
        booleanParam(name: 'TH_DISABLED',
                defaultValue: false,
                description: 'Check it if there is no Topology Handling part in the deployment')
        booleanParam(name: 'USE_SEF',
                defaultValue: true,
                description: 'Check it if SEF is deployed in namespace and tests should be running through it')
        choice(
                choices: ['5k', '80k'],
                name: 'ENM_SIZE',
                description: 'Default is 5k for nightly run, select 80k for characteristics testing'
        )
        booleanParam(name: 'DISCOVERY_ENABLED',
                defaultValue: true,
                description: 'Check it if the topology discovery stage should be enabled in this test')
        booleanParam(name: 'CRUD_ENABLED',
                defaultValue: true,
                description: 'Check it if the CM CRUD measurements stage should be enabled in this test')
        booleanParam(name: 'NOTIFICATIONS_ENABLED',
                defaultValue: true,
                description: 'Check it if the notifications measurements stage should be enabled in this test')
        booleanParam(name: 'DEREGISTRATION_ENABLED',
                defaultValue: true,
                description: 'Check it if the subsystem deregistration stage should be enabled in this test')

    }
    options { timestamps () }
    environment {
        BUILD_URL = "${env.JOB_URL}${env.BUILD_ID}/"
        TESTWARE_CLI_IMAGE="armdocker.rnd.ericsson.se/proj-eric-oss-dev-test/k6-reporting-tool-cli:latest"
        DISCOVERY_ENABLED = "${params.DISCOVERY_ENABLED}"
        CRUD_ENABLED = "${params.CRUD_ENABLED}"
        NOTIFICATIONS_ENABLED = "${params.NOTIFICATIONS_ENABLED}"
        DEREGISTRATION_ENABLED = "${params.DEREGISTRATION_ENABLED}"
        ENM_SIZE = "${params.ENM_SIZE}"
        ENM_TYPE = "${params.ENM_SIZE == "5k" ? "nightly" : "80k"}"
        USE_SEF = "${params.USE_SEF}"
    }
    stages {
        stage('Prepare') {
            steps {
                sh "${bob} -r ${ruleset} test-rule"
                sh 'git clean -xdff'
                sh 'git submodule sync'
                sh 'git submodule update --init --recursive'
                sh "pip install kubernetes"
            }
        }
        stage('Checkout') {
            steps {
                checkout([$class: 'GitSCM', branches: [[name: '*/master']], extensions: [[$class: 'CleanBeforeCheckout']], userRemoteConfigs: [[credentialsId: 'eoadm100-user-creds', url: 'https://gerrit-gamma.gic.ericsson.se/OSS/com.ericsson.oss.appEngineering/eric-oss-eas-app-engineering']]])
                sh "chmod +x -R ${env.WORKSPACE}"
            }
        }
        stage('Applying certificate') {
            steps {
                script {
                    withCredentials( [file(credentialsId: params.KUBECONFIG_FILE, variable: 'KUBECONFIG')]) {
                        sh "install -m 600 ${KUBECONFIG} ./admin.conf"
                        sh "./scripts/cacert.sh ${env.KUBECONFIG} ${env.NAMESPACE} ${env.ENM_HOSTNAME}"
                    }
                }
            }
        }
        stage("Get pods' logs") {
            steps {
                withCredentials([file(credentialsId: params.KUBECONFIG_FILE, variable: 'KUBECONFIG')]) {
                    sh "install -m 600 ${KUBECONFIG} ./admin.conf"
                    sh "sleep 90"
                    sh "./scripts/makePodLogs.sh ${env.KUBECONFIG} ${env.NAMESPACE}"
                }
            }
        }
        stage('Disco stage') {
            when {
                expression { env.DISCOVERY_ENABLED == "true" }
            }
            stages {
                stage('EAS K6 Test Deploy and Run') {
                    steps {
                        script {
                            withCredentials([file(credentialsId: params.KUBECONFIG_FILE, variable: 'KUBECONFIG')]) {
                                def operationFolder = "${env.ENM_TYPE}"
                                def operationsFile = "${operationFolder}/${operationFolder}.options.json"
                                sh "echo 'Disco stage'"
                                sh "echo ${operationsFile}"

                                sh "install -m 600 ${KUBECONFIG} ./admin.conf"
                                sh "python3 -u ./scripts/restartCount.py ${env.KUBECONFIG} ${env.NAMESPACE} \"restarts_before_test.txt\""

                                sh "./scripts/deployEASK6PodChar.sh ${env.KUBECONFIG} ${env.NAMESPACE} ${env.BUILD_URL} ${env.ENM_HOSTNAME} ${env.ENM_TYPE} char/${operationsFile} ${env.USE_SEF}"
                            }
                        }
                    }
                }
                stage('EAS Query result') {
                    steps {
                        parallel(
                            'Run copyK6Report Script': {
                                script {
                                    withCredentials([file(credentialsId: params.KUBECONFIG_FILE, variable: 'KUBECONFIG')]) {

                                        sh "echo 'copy disco'"
                                        sh "echo ${env.ENM_TYPE}-discovery"

                                        sh "install -m 600 ${KUBECONFIG} ./admin.conf"
                                        sh "./scripts/copyK6Report.sh ${env.KUBECONFIG} ${env.NAMESPACE} . ${env.ENM_TYPE}-discovery"
                                    }
                                }
                            },
                            'Tail eric-oss-eas-app-engineering log': {
                                script {
                                    withCredentials([file(credentialsId: params.KUBECONFIG_FILE, variable: 'KUBECONFIG')]) {

                                        sh "echo 'tail disco'"

                                        sh "install -m 600 ${KUBECONFIG} ./admin.conf"
                                        sh "sleep 90"
                                        testVersion = sh(script: "kubectl --kubeconfig=${env.KUBECONFIG} -n ${env.NAMESPACE} exec eric-oss-eas-app-engineering -- sh -c 'echo \$TEST_VERSION'", returnStdout: true).trim()
                                        sh "kubectl --kubeconfig=${env.KUBECONFIG} -n ${env.NAMESPACE} logs eric-oss-eas-app-engineering -f || exit 0"
                                    }
                                }
                            }
                        )
                    }
                }
            }
        }
        stage('CRUD stage') {
            when {
                expression { env.CRUD_ENABLED == "true" }
            }
            steps {
                script {
                    def operations = ["crud", "cleanup"]
//                    def operations = ["create", "read", "update", "delete", "cleanup"]
                    for (int i = 1; i < 4; i++) {
                        for (int j = 0; j < operations.size(); j++) {
//                            def operationFile = (operations[j] == 'cleanup' ? 'char/crud/enm/delete' : "char/crud/ncmp/${env.ENM_TYPE}/${operations[j]}")
                            def operationFile = (operations[j] == 'cleanup' ? 'char/crud/enm/cleanup' : "char/${env.ENM_TYPE}/${env.ENM_TYPE}")
                            stage("${operations[j]}-${i} : EAS K6 Test Deploy and Run") {
                                withCredentials([file(credentialsId: params.KUBECONFIG_FILE, variable: 'KUBECONFIG')]) {

                                    sh "echo '${operationFile}.crud.options.json'"

                                    sh "install -m 600 ${KUBECONFIG} ./admin.conf"
                                    sh "python3 -u ./scripts/restartCount.py ${env.KUBECONFIG} ${env.NAMESPACE} \"restarts_before_test.txt\""

                                    sh "./scripts/deployEASK6PodChar.sh ${env.KUBECONFIG} ${env.NAMESPACE} ${env.BUILD_URL} ${env.ENM_HOSTNAME} ${env.ENM_TYPE} ${operationFile}.crud.options.json ${env.USE_SEF}"
                                }
                            }
                            stage("${operations[j]}-${i} : EAS Query result") {
                                parallel(
                                    'Run copyK6Report Script': {
                                        withCredentials([file(credentialsId: params.KUBECONFIG_FILE, variable: 'KUBECONFIG')]) {

                                            sh "echo ${operations[j]}-${i}"

                                            sh "install -m 600 ${KUBECONFIG} ./admin.conf"
                                            sh "./scripts/copyK6Report.sh ${env.KUBECONFIG} ${env.NAMESPACE} . ${operations[j]}-${i}"
                                        }
                                    },
                                    'Tail eric-oss-eas-app-engineering log': {
                                        script {
                                            withCredentials([file(credentialsId: params.KUBECONFIG_FILE, variable: 'KUBECONFIG')]) {

                                                sh "echo ${operations[j]}-${i} tail log"

                                                sh "install -m 600 ${KUBECONFIG} ./admin.conf"
                                                sh "sleep 45"
                                                testVersion = sh(script: "kubectl --kubeconfig=${env.KUBECONFIG} -n ${env.NAMESPACE} exec eric-oss-eas-app-engineering -- sh -c 'echo \$TEST_VERSION'", returnStdout: true).trim()
                                                sh "kubectl --kubeconfig=${env.KUBECONFIG} -n ${env.NAMESPACE} logs eric-oss-eas-app-engineering -f || exit 0"
                                            }
                                        }
                                    }
                                )
                            }
                        }
                    }
                }
            }
        }
        stage('Notifications stage') {
            when {
                expression { env.NOTIFICATIONS_ENABLED == "true" && env.ENM_SIZE == "5k"}
            }
            stages {
                stage('EAS K6 Test Deploy and Run') {
                    steps {
                        script {
                            withCredentials([file(credentialsId: params.KUBECONFIG_FILE, variable: 'KUBECONFIG')]) {
                                def operationFolder = "${env.ENM_TYPE}"
                                def operationsFile = "char/${operationFolder}/${operationFolder}.events.options.json"
                                sh "echo 'Notifications stage'"
                                sh "echo ${operationsFile}"

                                sh "install -m 600 ${KUBECONFIG} ./admin.conf"
                                sh "python3 -u ./scripts/restartCount.py ${env.KUBECONFIG} ${env.NAMESPACE} \"restarts_before_test.txt\""

                                sh "./scripts/deployEASK6PodChar.sh ${env.KUBECONFIG} ${env.NAMESPACE} ${env.BUILD_URL} ${env.ENM_HOSTNAME} ${env.ENM_TYPE} ${operationsFile} ${env.USE_SEF}"
                            }
                        }
                    }
                }
                stage('EAS Query result') {
                    steps {
                        parallel(
                            'Run copyK6Report Script': {
                                script {
                                    withCredentials([file(credentialsId: params.KUBECONFIG_FILE, variable: 'KUBECONFIG')]) {

                                        sh "echo 'copy notif'"
                                        sh "echo ${env.ENM_TYPE}-events"

                                        sh "install -m 600 ${KUBECONFIG} ./admin.conf"
                                        sh "./scripts/copyK6Report.sh ${env.KUBECONFIG} ${env.NAMESPACE} . ${env.ENM_TYPE}-events"
                                    }
                                }
                            },
                            'Tail eric-oss-eas-app-engineering log': {
                                script {
                                    withCredentials([file(credentialsId: params.KUBECONFIG_FILE, variable: 'KUBECONFIG')]) {

                                        sh "echo 'tail notif'"

                                        sh "install -m 600 ${KUBECONFIG} ./admin.conf"
                                        sh "sleep 90"
                                        testVersion = sh(script: "kubectl --kubeconfig=${env.KUBECONFIG} -n ${env.NAMESPACE} exec eric-oss-eas-app-engineering -- sh -c 'echo \$TEST_VERSION'", returnStdout: true).trim()
                                        sh "kubectl --kubeconfig=${env.KUBECONFIG} -n ${env.NAMESPACE} logs eric-oss-eas-app-engineering -f || exit 0"
                                    }
                                }
                            }
                        )
                    }
                }
            }
        }
        stage('Deregistration stage') {
            when {
                expression { env.DEREGISTRATION_ENABLED == "true" }
            }
            stages {
                stage('EAS K6 Test Deploy and Run') {
                    steps {
                        script {
                            withCredentials([file(credentialsId: params.KUBECONFIG_FILE, variable: 'KUBECONFIG')]) {
                                def operationFolder = "${env.ENM_TYPE}"
                                def operationsFile = "char/${operationFolder}/${operationFolder}.deregistration.options.json"
                                sh "echo 'Deregistration stage'"
                                sh "echo ${operationsFile}"

                                sh "install -m 600 ${KUBECONFIG} ./admin.conf"
                                sh "python3 -u ./scripts/restartCount.py ${env.KUBECONFIG} ${env.NAMESPACE} \"restarts_before_test.txt\""

                                sh "./scripts/deployEASK6PodChar.sh ${env.KUBECONFIG} ${env.NAMESPACE} ${env.BUILD_URL} ${env.ENM_HOSTNAME} ${env.ENM_TYPE} ${operationsFile} ${env.USE_SEF}"
                            }
                        }
                    }
                }
                stage('EAS Query result') {
                    steps {
                        parallel(
                            'Run copyK6Report Script': {
                                script {
                                    withCredentials([file(credentialsId: params.KUBECONFIG_FILE, variable: 'KUBECONFIG')]) {
                                        sh "echo 'copy deregister'"
                                        sh "echo ${env.ENM_TYPE}-deregistration"

                                        sh "install -m 600 ${KUBECONFIG} ./admin.conf"
                                        sh "./scripts/copyK6Report.sh ${env.KUBECONFIG} ${env.NAMESPACE} . ${env.ENM_TYPE}-deregistration"
                                    }
                                }
                            },
                            'Tail eric-oss-eas-app-engineering log': {
                                script {
                                    withCredentials([file(credentialsId: params.KUBECONFIG_FILE, variable: 'KUBECONFIG')]) {

                                        sh "echo 'tail deregister'"

                                        sh "install -m 600 ${KUBECONFIG} ./admin.conf"
                                        sh "sleep 90"
                                        testVersion = sh(script: "kubectl --kubeconfig=${env.KUBECONFIG} -n ${env.NAMESPACE} exec eric-oss-eas-app-engineering -- sh -c 'echo \$TEST_VERSION'", returnStdout: true).trim()
                                        sh "kubectl --kubeconfig=${env.KUBECONFIG} -n ${env.NAMESPACE} logs eric-oss-eas-app-engineering -f || exit 0"
                                    }
                                }
                            }
                        )
                    }
                }
            }
        }
        stage('EAS Verify Results') {
            steps {
                script {
                    def tests = ""
                    tests = (env.DISCOVERY_ENABLED == "true" ? 'discovery' : tests)
                    tests = (env.CRUD_ENABLED == "true" ? "${tests}-crud" : tests)
                    tests = (env.NOTIFICATIONS_ENABLED == "true" ? "${tests}-events" : tests)
                    tests = (env.DEREGISTRATION_ENABLED == "true" ? "${tests}-deregistration" : tests)
                    sh "echo ${tests}"
                    sh "python3 -u ./scripts/verifyResultsChar.py \"${env.ENM_TYPE}\" \"${tests}\""
                }
            }
        }
        stage('EAS Verify Restarts') {
            steps {
                script {
                    withCredentials( [file(credentialsId: params.KUBECONFIG_FILE, variable: 'KUBECONFIG')]) {
                        sh "python3 -u ./scripts/restartCount.py ${env.KUBECONFIG} ${env.NAMESPACE} \"restarts_after_test.txt\""
                        sh "python3 -u ./scripts/verifyRestarts.py \"restarts_before_test.txt\" \"restarts_after_test.txt\""
                    }
                }
            }
        }
    }
    post {
        always {
            script {
                try {
                    sh "mkdir -p char_logs"
                    sh "cp -r *-summary.json char_logs/"
                    sh "cp -r *-eric-oss-eas-app-engineering.log char_logs/"
                    sh "cp -r *-eas-result.html char_logs/"

                    sh label: 'Make snapshot of logs from tempFolder to tempFolder2', returnStatus: true, script: 'cp -r tempFolder/ tempFolder2/'
                    sh label: 'Make snapshot of logs from tempFolder2 to pod_logs.zip', returnStatus: true, script: 'zip -r pod_logs.zip tempFolder2/'
                    sh label: 'Make snapshot of char logs to char_logs.zip', returnStatus: true, script: 'zip -r char_logs.zip char_logs/'
                    archiveArtifacts 'pod_logs.zip'
                    archiveArtifacts 'char_logs.zip'
                    archiveArtifacts 'char_results.json'
                } catch (Exception e) {
                    currentBuild.result = 'FAILURE'
                    echo "There is an error during this step: ${e.getMessage()}"
                }
            }
            publishHTML([allowMissing: true,
                         alwaysLinkToLastBuild: true,
                         keepAll: true,
                         reportDir: '',
                         reportFiles: 'eas-result.html',
                         reportName: 'Report',
                         reportTitles: ''])
            script {
                withCredentials( [file(credentialsId: params.KUBECONFIG_FILE, variable: 'KUBECONFIG')]) {
                    RPT_API_URL = sh(script: "kubectl --kubeconfig=${env.KUBECONFIG} get secrets/testware-resources-secret --template={{.data.api_url}} -n ${NAMESPACE} | base64 -d",
                        returnStdout: true)
                    RPT_GUI_URL = sh(script: "kubectl --kubeconfig=${env.KUBECONFIG} get secrets/testware-resources-secret --template={{.data.gui_url}} -n ${NAMESPACE} | base64 -d",
                        returnStdout: true)
                }
                def buildUrlEncoded = sh(script: "echo -n ${BUILD_URL} | base64 -w 0", returnStdout: true)
                def response = sh(script: "curl ${RPT_API_URL}/v2/job/${buildUrlEncoded}",
                        returnStdout: true)
                def responseJson = readJSON text: response
                def executions = responseJson.executions
                def passed = false
                if (executions) {
                    passed = true
                } else {
                    println(responseJson)
                }
                for (Object execution : executions) {
                    if (!execution.passed) {
                        passed = false
                    }
                }
                def reportLink = "${RPT_GUI_URL}" + '/#job-reports/job-details?jobUrl=' + buildUrlEncoded

                def htmlOutput = """
                 <table>
                    <tr>
                        <td><img src='${env.JENKINS_URL}static/2833d4bf/images/svgs/warning.svg' alt='Warning'></td>
                        <td><h2>Test Status</h2></td>
                    </tr>
                </table>
                <ul>
                    <li>Status: <span style="color: ${passed ? 'green' : 'red'};">${passed ? 'SUCCESSFUL' : 'FAILED'}</span></li>
                    <li><a href='${reportLink}'>Live Report Link</a></li>
                </ul>
                """
                if(currentBuild.description != null) {
                    currentBuild.description = currentBuild.description + htmlOutput
                } else {
                    currentBuild.description = htmlOutput
                }
                sh """
                    echo 'status=${passed}' > artifact.properties
                    echo 'jobDetailsUrl=${BUILD_URL}' >> artifact.properties
                    echo 'testVersion=${testVersion}' >> artifact.properties
                """
            }
            archiveArtifacts 'artifact.properties'
            cleanWs()
        }
    }
}

// More about @Builder: http://mrhaki.blogspot.com/2014/05/groovy-goodness-use-builder-ast.html
import groovy.transform.builder.Builder
import groovy.transform.builder.SimpleStrategy

@Builder(builderStrategy = SimpleStrategy, prefix = '')
class BobCommand {
    def bobImage = 'bob.2.0:latest'
    def envVars = [:]
    def needDockerSocket = false

    String toString() {
        def env = envVars
                .collect({ entry -> "-e ${entry.key}=\"${entry.value}\"" })
                .join(' ')

        def cmd = """\
            |docker run
            |--init
            |--rm
            |--workdir \${PWD}
            |--user \$(id -u):\$(id -g)
            |-v \${PWD}:\${PWD}
            |-v \${HOME}:\${HOME}
            |${needDockerSocket ? '-v /var/run/docker.sock:/var/run/docker.sock' : ''}
            |${env}
            |\$(for group in \$(id -G); do printf ' --group-add %s' "\$group"; done)
            |--group-add \$(stat -c '%g' /var/run/docker.sock)
            |${bobImage}
            |"""
        return cmd
                .stripMargin()           // remove indentation
                .replace('\n', ' ')      // join lines
                .replaceAll(/[ ]+/, ' ') // replace multiple spaces by one
    }
}
