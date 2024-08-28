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
  string(name: 'ARMDOCKER_USER_SECRET',
                description: 'ARM Docker secret')
        string(name: 'NAMESPACE',
                description: 'Namespace to execute the test against' )
        string(name: 'KUBECONFIG_FILE',
                description: 'Kubernetes configuration file to specify which environment to install on' )
        string(name: 'AGENT_LABEL',
                defaultValue: 'evo_docker_engine',
                description: 'Label of agent which be used')
    }
    options { timestamps () }
    environment {
        BUILD_URL = "${env.JOB_URL}${env.BUILD_ID}/"
        TESTWARE_CLI_IMAGE="armdocker.rnd.ericsson.se/proj-eric-oss-dev-test/k6-reporting-tool-cli:latest"
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

        stage('EAS K6 Test Deploy and Run') {
            steps {
                script {
                    withCredentials( [file(credentialsId: params.KUBECONFIG_FILE, variable: 'KUBECONFIG')]) {
                        sh "install -m 600 ${KUBECONFIG} ./admin.conf"
                        sh "python3 -u ./scripts/restartCount.py ${env.KUBECONFIG} ${env.NAMESPACE} \"restarts_before_test.txt\""

                        sh "./scripts/deployEASK6Pod.sh ${env.KUBECONFIG} ${env.NAMESPACE} ${env.BUILD_URL}"
                    }
                }
            }
        }
        stage('EAS Query result') {
            parallel{
                stage('Run copyK6Report Script') {
                    steps {
                        script {
                            withCredentials( [file(credentialsId: params.KUBECONFIG_FILE, variable: 'KUBECONFIG')]) {
                                sh "install -m 600 ${KUBECONFIG} ./admin.conf"
                                sh "./scripts/copyK6Report.sh ${env.KUBECONFIG} ${env.NAMESPACE} ."
                            }
                        }
                    }
                }
                stage('Tail eric-oss-eas-app-engineering log') {
                    steps{
                        script {
                            withCredentials( [file(credentialsId: params.KUBECONFIG_FILE, variable: 'KUBECONFIG')]) {
                                sh "install -m 600 ${KUBECONFIG} ./admin.conf"
                                sh "sleep 90"
                                testVersion = sh(script: "kubectl --kubeconfig=${env.KUBECONFIG} -n ${env.NAMESPACE} exec eric-oss-eas-app-engineering -- sh -c 'echo \$TEST_VERSION'", returnStdout: true).trim()
                                sh "kubectl --kubeconfig=${env.KUBECONFIG} -n ${env.NAMESPACE} logs eric-oss-eas-app-engineering -f || exit 0"
                            }
                        }
                    }
                }
                stage("Get pods' logs") {
                    steps{
                        script {
                            withCredentials( [file(credentialsId: params.KUBECONFIG_FILE, variable: 'KUBECONFIG')]) {
                                sh "install -m 600 ${KUBECONFIG} ./admin.conf"
                                sh "sleep 90"
                                sh "./scripts/makePodLogs.sh ${env.KUBECONFIG} ${env.NAMESPACE}"
                            }
                        }
                    }
                }
            }
        }
        stage('EAS Verify Results') {
            steps {
                sh "python3 -u ./scripts/verifyResults.py \"summary.json\""
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
            archiveArtifacts 'summary.json'
            archiveArtifacts 'eric-oss-eas-app-engineering.log'
            archiveArtifacts 'eas-result.html'
            script {
                try {
                    sh label: 'Make snapshot of logs from tempFolder to tempFolder2', returnStatus: true, script: 'cp -r tempFolder/ tempFolder2/'
                    sh label: 'Make snapshot of logs from tempFolder2 to all_logs.zip', returnStatus: true, script: 'zip -r all_logs.zip tempFolder2/'
                    archiveArtifacts 'all_logs.zip'
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
                TESTWARE_CLI_CMD = "docker run --rm -t --pull always -e RPT_API_URL=${RPT_API_URL} " +
                    "-e RPT_GUI_URL=${RPT_GUI_URL} -v ${WORKSPACE}:${WORKSPACE} "+
                    "--user `id -u`:`id -g` ${TESTWARE_CLI_IMAGE} testware-cli "
                def testwareOutput = sh(script: "${TESTWARE_CLI_CMD} get-status -u ${env.BUILD_URL} --path ${WORKSPACE}", returnStdout: true).trim()
                def outputMap = [:]

                def lines = testwareOutput.readLines()
                for (String line : lines) {
                    line = line.replaceAll("\u001B\\[[;\\d]*m", "").trim()
                    if (line.startsWith(">")) {
                        line = line.substring(1).trim()
                    }
                def (key, value) = line.split(/\s*:\s*/, 2)
                outputMap[key.trim()] = value.trim()
                }
                def passed = outputMap['passed'] == 'True'
                def reportLink = outputMap['reportLink']

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
