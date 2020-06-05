const ROOT_SITE_URL = "https://bspmonitors.cineca.it"


let client = new jso.JSO({
    providerID: "HBP",
    client_id: "d59569a0-6485-4eff-88e0-f11cf92f43bc",
    redirect_uri: ROOT_SITE_URL + "/hpc-monitor",
    authorization: "https://services.humanbrainproject.eu/oidc/authorize",
})


var user = null;
var hpcContext = "";
var projects = [];
var isRequestProjectFinished = false;
var isRequestSAProjectFinished = false;
var totalProject = {
    "id": ".total-quota",
    "service-account": false,
    "quota": 0,
}


function appendTotalProject() {
    createProjectElement({
        "id": "total",
        "service-account": false
    });
    totalProject.el = setCircleProgressBarByClassName(".total-quota");
    totalProject.step = 1.0 / projects.length;
    console.log("total project = " + projects.length.toString() + " total step = " + totalProject.step.toString());
}    


function appendDefaultProject() {
    createProjectElement({
        "id": "default",
        "service-account": false
    });
    projects.push({
        "id": "default-quota",
        "el": setCircleProgressBarByClassName(".default-quota"),
        "service-account": false,
        "perc": 1,
        "quota": 0
    });
}


function appendProject(project, isServiceAccount=false) {
    let projectName = (isServiceAccount) ? project.project_name : project;
    createProjectElement({
        "id": projectName.toLowerCase().replace(" ", "_"),
        "service-account": isServiceAccount
    });
    project = {
        "id": projectName.toLowerCase() + "-quota",
        "el": setCircleProgressBarByClassName("." + projectName.toLowerCase() + "-quota"),
        "service-account": isServiceAccount,
        "perc": 1, // set percent quota 
        "quota": (isServiceAccount) ? (project.time_left / 3600) : 0
    };
    projects.push(project);
    totalProject.quota += project.quota;
}


async function checkUser(data) {
    console.log("extracting user");
    if (typeof data == "object") {
        user = data.client.role.selected;
    } else if (typeof data == "string") {
        try {
            user = data.split('{"selected":"')[1].split('"')[0];
        } catch (e) {
            user = data.split('role={selected=')[1].split(',')[0];
        }
    } else if (data.startsWith("<html>")) {
        var root = document.createElement("html");
        root.innerHTML = data;
        var elements = root.getElementsByTagName("li");
        for (let i = 0; i < elements.length; i++) {
            let s = elements[i].innerHTML;
            if (s.includes("role={selected=")) {
                user = s.split("role={selected=")[1].split(",")[0];
                break;
            }
        }
    } else {
        user = role.selected;
    }
    if (user == "anonymous") {
        await sleep(500);
        if (hpcContext.id != "PIZDAINT") {
            showAlert("This user has no credentials on " + hpcContext.id);
            $(".circular-progress-bar").removeClass("fade-infinite");
            $("#bottom-panel").removeClass("fade-infinite");
            return false;
        } else if (hpcContext.id == "PIZDAINT") {
            showAlert("This user has no credentials on " + hpcContext.id + "<br>Please use the Service Account on this system to submit your jobs.");
        }
    }
    return true;
}

function extractGroupsFromHTML(data) {
    console.log("extracting groups from html response...");
    var root = document.createElement("html");
    root.innerHTML = data;
    var elements = root.getElementsByTagName("li");
    for (let i = 0; i < elements.length; i++) {
        let s = elements[i].innerHTML;
        if (s.includes("group=")) {
            let g = (s.substring(s.indexOf("group="), s.length - 1)).split("group=")[1];
            return g.split(",");
        }
    }
}


function requestProject(session, hpc, isServiceAccount=false) {
    var URL = isServiceAccount ? URL = SERVICE_ACCOUNT_URL + "quotas/" + hpc.id.toLowerCase() + "/" : hpc.root_url;
    console.log("projectRequests() called. URL: " + URL);
    $.ajax({
	url: URL,
	headers: {
	    "Authorization": "Bearer " + session.access_token,
	    "Content-Type": "application/json",
            "Accept": "application/json"
        },
	method: "GET",
	timeout: 30000,
	success: function(result) {
	    if (isServiceAccount) {
                console.log("append service-account projects");
		for (let i = 0; i < result.length; i++) {
	            appendProject(result[i], isServiceAccount);
		}
	    } else {
                if (!checkUser(result)) {
                    closeDetailsPanel();
                    return;
                }
                console.log("extracting groups...");
                let groups = [];
                if (typeof result == "object") {
                    groups = result.client.xlogin.availableGroups;
                } else if (result.startsWith("<html>")) {    
                    // handle result if it is in HTML format.
                    groups = extractGroupsFromHTML(result);
                } else if (result.includes("group=")) {
                    // handle result if it is in JSON format.
                    data = JSON.parse(result);
                    groups = data.client.xlogin.group
                }
                if (groups[0] == "null") {
                    groups = [];
                }
                if (groups.length > 0) {
                    for (let i = 0; i < groups.length; i++) {
                        appendProject(groups[i]);
                    }
                } else {
                    // if no project is found, add default one.
                    appendDefaultProject();
                }
                console.log(groups)
            }
        },
	error: function(error, status, code) {
            if (status == "timeout") {
	        showAlert("Your request has expired.<br>Please try again later.");
	    }
	},
	complete: function(data) {
            if (isServiceAccount) {
                isRequestSAProjectFinished = true;
            } else {
                isRequestProjectFinished = true;
            }
        }
    });
}


function extractProjectQuota(data, project) {
    console.log("Extracting quota... ");
    //console.log(data);
    let quota;
    if (typeof data == "object") {
        for (var key in data) {
            if (key == "remainingComputeTime") {
                var subKey = Object.keys(data[key]);
                if (subKey.length == 0) {
                    quota = data[key];
                }
                else if (subKey.length == 1) {
                    quota = data[key][subKey].remaining;
                }
                break;
            }
        }
    } else if (typeof data == "string") {
        try {
            quota = data.split('"remainingComputeTime":')[1].split(',')[0];
        } catch (e) {
            try {
                quota = data.split('remainingComputeTime=')[1].split(',')[0];
            } catch (e) {
                quota = data.split('remainingComputeTime</td>\n<td>')[1].split('</td>')[0];
            }
        }
    }else {
        let root = document.createElement("html");
        root.innerHTML = data;
        let elements = root.getElementsByTagName("td");
        for (let i = 0; i < elements.length; i++) {
            let s = elements[i].innerHTML;
            if (s.includes("remainingComputeTime")) {
                quota = elements[i+1].innerHTML;
                break;
            }
        }
    }
    if (quota == -1) {
        showAlert("Unable to fetch quotas on " + hpcContext.id + ".<br>Please try again later");
    }
    return Number(quota);
}


function requestProjectQuota(session, project) {
    var projectId = project["id"].split("-quota")[0];
    console.log("requestProjectQuota() on project: " + projectId);
    
    var header = {
        "Authorization": "Bearer " + session.access_token,
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    if (projectId != "default") {
        header["X-UNICORE-User-Preferences"] = "group:" + projectId
    }
    
    $.ajax({
        url: hpcContext.quota_url,
        headers: header,
        timeout: 30000,
        success: function(result) {
            project["quota"] = extractProjectQuota(result, projectId);
            project["perc"] = 1;
            totalProject.quota += project.quota;
        },
        error: function(error, status, code) {
            if (status == "timeout") {
                showAlert("Your request has expired.<br>Please try again later.");
            }
            // handle -1 error and then stop any animation
        },
        complete: function(data) {
            animateQuotaBar(project);
            animateQuotaBar(totalProject);
        }
    });
}


function loadQuota(session) {
    // get quota for all projects contained into projects[]
    console.log("loadQuota() called, number of projects=" + projects.length);
    for (let i = 0; i < projects.length; i++) {
        if (projects[i]["service-account"]) {
            animateQuotaBar(projects[i]);
            animateQuotaBar(totalProject);
        } else {
            // if projects[i] is not a service-account's project, then request quota
            requestProjectQuota(session, projects[i]);
        }
    }
}


function animateQuotaBar(project) {
    if (project.id != ".total-quota") {
        for (let i = 0; i < project.el.length; i++) {
            project["el"][i]._container.classList.remove("fade-infinite");
            if (project["quota"] != 0) {
                project["el"][i].animate(project.perc);
            }
        }
    } else {
        let step = totalProject.step;
        totalProject.step += step;
        for (let i = 0; i < totalProject.el.length; i++) {
            totalProject.el[i]._container.classList.remove("fade-infinite");
            totalProject.el[i].animate(step);
        }
    }
}


async function getProjects(hpc) {
    console.log("getProjects() CALLED.");
    console.log($("." + hpc.id.toLowerCase() + "-sa-status > .sonar > .sa-status-icon"));

    user = null;
    if (hpcContext != hpc) {
        // if context is changed, empty projects array
        hpcContext = hpc;
        projects = [];
        totalProject.quota = 0;
        totalProject.perc = 0;
    }
    hpcContext = hpc;

    try {
        client.callback();
    } catch (e) {
	console.warn("Issue decoding the token");
    }

    var authorization = client.getToken();
    authorization.then(async (session) => {

        if (hpc.id == "NSG") {
            isRequestSAProjectFinished = false;
            isRequestProjectFinished = true;
            console.log("Requesting NSG Service Account projects");
            requestProject(session, hpc, true);
        } else {
            isRequestSAProjectFinished = ($("." + hpc.id.toLowerCase() + "-sa-status > .sonar > .sa-status-icon").hasClass("ok")) ? false : true;
            isRequestProjectFinished = false;
            console.log("Requesting " + hpc.id.toUpperCase() + " projects");
            requestProject(session, hpc);
            if ($("." + hpc.id.toLowerCase() + "-sa-status > .sonar > .sa-status-icon").hasClass("ok")) {
                console.log("Requesting " + hpc.id.toUpperCase() + " Service Account projects");
                requestProject(session, hpc, true)
            }
        }

        while (!isRequestProjectFinished || !isRequestSAProjectFinished) {
            await sleep(500);
        }
        
        if (user == "anonymous" && !(hpc.id == "NSG" || hpc.id == "PIZDAINT")) {
            return;
        }
        appendTotalProject();
        openDetailsPanel();
        await sleep(500);
        loadQuota(session);
    });
}


function checkJobSubmission(checkButton) {
 
    let projectName = checkButton.classList[1];
    let isServiceAccount = checkButton.parentElement.parentElement.classList.contains("service-account");

    try {
        client.callback();
    } catch (e) {
        console.warn("Issue decoding the token");
    }

    var authorization = client.getToken();
    authorization.then((session) => {

        let URL = '';
        let METHOD = '';
        let JOB = null;
        let HEADERS = {
            "Authorization": "Bearer " + session.access_token,
            "Content-Type": "application/json"
        };

        if (isServiceAccount) {
            URL = SERVICE_ACCOUNT_URL + "jobs/" + hpcContext.id + "/" + projectName.split(" (sa)")[0] + "/example/";
            METHOD = "GET";
        } else {
            if (hpcContext.id == "PIZDAINT") {
                URL = ROOT_SITE_URL +  hpcContext.id.toLowerCase() + "/check";
                METHOD = "GET";
            } else {
                URL = hpcContext.submit_url;
                METHOD = "POST";
                JOB = hpcContext.job.on_system;
                HEADERS["X-UNICORE-User-Preferences"] = "group:" + projectName;
            }
        }

        $.ajax({
            url: URL,
            method: METHOD,
            headers: HEADERS,
            data: JOB,
            beforeSend: function(data) {
                $(".submission-button." + projectName).addClass("fade-out");
                $(".project.sonar." + projectName).css("opacity", "1");
            },
            success: function(data, status, code) {
                $(".project.sonar." + projectName + " > .submission-icon").addClass("ok");
            },
            error: function(data, status, code) {
                if (data.status == 201) {
                    $(".project.sonar." + projectName + " > .submission-icon").addClass("ok");
                } else {
                    $(".project.sonar." + projectName + " > .submission-icon").addClass("no");
                    showAlert("The user cannot submit job at this moment");
                }
            },
            complete: function(data, status, code) {
                $(".project.sonar." + projectName + " > .sonar-wave").css("animation", "stop");
                $(".project.sonar." + projectName + " > .submission-icon").css("animation", "loadedIcon 1s ease-out 1 forwards");
            }
	    });

    });
}


function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


var decodeHTML = function (html) {
    var txt = document.createElement('textarea');
    txt.innerHTML = html;
    return txt.value;
};


function createAlert(message) {
    a = document.createElement("div");
    a.className = "alert alert-info";
    a.setAttribute("role", "alert");
    a.innerHTML = message;
    return a;
}


function createProjectElement(PROJECT) {
    var panels = $(".projects");
    var isLastGray = panels.children().last().hasClass("row-gray");

    /* Creating project element for bigger screen */
    var root = document.createElement("div");
    root.className = "row project-section";

    if (PROJECT["service-account"]) {
        root.classList.add("service-account");
    }
    if (!isLastGray) {
        root.classList.add("row-gray");
    }

    var buttonSection = document.createElement("div");
    buttonSection.className = "col-4 project-button-section";
    var button = document.createElement("div");
    button.className = "project-button";
    if (!root.classList.contains("row-gray") && PROJECT.id != "Total") {
        button.classList.add("button-gray");
    }
    button.innerHTML = PROJECT.id;

    buttonSection.appendChild(button);

    var barSection = document.createElement("div");
    barSection.className = "col-4 project-quota-section";
    var bar = document.createElement("div");
    bar.className = "circular-progress-bar fade-infinite " + PROJECT.id.toLowerCase() + "-quota";

    barSection.appendChild(bar);

    var submissionSection = document.createElement("div");
    submissionSection.className = "col-4 project-submission-section";
    var sonarSection = document.createElement("div");
    sonarSection.className = "project sonar " + PROJECT.id;
    var sonarWave = document.createElement("div");
    sonarWave.className = "sonar-wave";
    var sonarIcon = document.createElement("div");
    sonarIcon.className = "submission-icon";
    var submissionButton = document.createElement("div");
    submissionButton.className = "submission-button " + PROJECT.id;
    submissionButton.setAttribute("onclick", "checkJobSubmission(this)");
    if (!root.classList.contains("row-gray")) {
        submissionButton.classList.add("gray");
    }
    submissionButton.innerHTML = "Check";


    if (PROJECT.id != "total") {
        sonarSection.appendChild(sonarWave);
        sonarSection.appendChild(sonarIcon);
        submissionSection.appendChild(sonarSection);
        submissionSection.appendChild(submissionButton);
    }

    if (PROJECT.id == "total") {
        root.classList.add("total-row");
    }
    root.appendChild(buttonSection);
    root.appendChild(barSection);
    root.appendChild(submissionSection);

    /* Creating project element for extra small screen */
    var rootXS = document.createElement("div");
    rootXS.className = "row project-section";

    if (PROJECT["service-account"]) {
        rootXS.classList.add("service-account");
    }
    if (!isLastGray) {
        rootXS.classList.add("row-gray");
    }

    var buttonSectionXS = document.createElement("div");
    buttonSectionXS.className = "col-12 project-button-section";
    var buttonXS = document.createElement("div");
    buttonXS.className = "project-button";
    if (!root.classList.contains("row-gray")) {
        buttonXS.classList.add("gray");
    }
    buttonXS.innerHTML = PROJECT.id;

    buttonSectionXS.appendChild(buttonXS);

    var barLabelXS = document.createElement("div");
    barLabelXS.className = "col-6 info-text quota-label";
    if (hpcContext.id != "PIZDAINT") {
        barLabelXS.innerHTML = "Quota (core/h)";
    } else {
        barLabelXS.innerHTML = "Quota (node/h)";
    }

    var barSectionXS = document.createElement("div");
    barSectionXS.className = "col-6 project-quota-section";
    var barXS = document.createElement("div");
    barXS.className = "circular-progress-bar fade-infinite " + PROJECT.id.toLowerCase() + "-quota";

    barSectionXS.appendChild(barXS);

    var submissionLabelXS = document.createElement("div");
    submissionLabelXS.className = "col-6 info-text submission-label";
    submissionLabelXS.innerHTML = "Submission Enabled";

    var submissionSectionXS = document.createElement("div");
    submissionSectionXS.className = "col-6 project-submission-section";
    var sonarSectionXS = document.createElement("div");
    sonarSectionXS.className = "project sonar " + PROJECT.id;
    var sonarWaveXS = document.createElement("div");
    sonarWaveXS.className = "sonar-wave";
    var sonarIconXS = document.createElement("div");
    sonarIconXS.className = "submission-icon";
    var submissionButtonXS = document.createElement("div");
    submissionButtonXS.className = "submission-button " + PROJECT.id;
    submissionButtonXS.setAttribute("onclick", "checkJobSubmission(this)");
    if (!root.classList.contains("row-gray") && PROJECT.id != "Total") {
        submissionButtonXS.classList.add("gray");
    }
    submissionButtonXS.innerHTML = "Check";

    if (PROJECT.id != "total") {
        sonarSectionXS.appendChild(sonarWaveXS);
        sonarSectionXS.appendChild(sonarIconXS);
        submissionSectionXS.appendChild(sonarSectionXS);
        submissionSectionXS.appendChild(submissionButtonXS);
    }

    if (PROJECT.id == "total") {
        rootXS.classList.add("total-row");
    }
    rootXS.appendChild(buttonSectionXS);
    rootXS.appendChild(barLabelXS);
    rootXS.appendChild(barSectionXS);
    if (PROJECT.id != "total") {
        rootXS.appendChild(submissionLabelXS);
    }
    rootXS.appendChild(submissionSectionXS);

    for (let i = 0; i < panels.length; i++) {
        if (!panels[i].classList.contains("xs")) {
            panels[i].appendChild(root.cloneNode(true));
        } else {
            panels[i].appendChild(rootXS);
        }
    }
}


function setCircleProgressBarByClassName(className, id) {
    console.log("setCircleProgressBarByClassName(" + className + ")");
    var bars = [];

    $(className).each(function () {
        bars.push(setCircleProgressBar(this));
    });

    return bars;
}

function setCircleProgressBar(id) {
    var bar = new ProgressBar.Circle(id, {
        // This has to be the same size as the maximum width to
        // prevent clipping
        strokeWidth: 10,
        trailWidth: 1,
        easing: "easeInOut",
        color: "#37ABC8",
        duration: 1400,
        text: {
            autoStyleContainer: false
        },
        // Set default step function for all animate calls
        step: function(state, circle) {
            circle.setText(0);
            var quota = 0;
            for (let i = 0; i < projects.length; i++) {
                if (id.classList.contains(projects[i]["id"])) {
                    var quota = (projects[i]["quota"].toString().split(".")[0]);
                    break;
                }
            }

            if (quota.length < 7) {
                circle.setText(quota);
            } else if (quota.length < 10) {
                circle.setText(quota.slice(0, quota.length - 3) + "K");
            } 

            if (id.classList.contains("total-quota")) {
                let quota = totalProject.quota.toString().split(".")[0];
                if (quota.length < 7) {
                    circle.setText(quota);
                } else {
                    circle.setText(quota.slice(0, quota.length - 3) + "K");
                }
            }
        }
    });

    bar.text.style.fontFamily = "'Raleway', Helvetica, sans-serif";
    bar.text.style.fontSize = "0.8em";
    bar.text.style.color = "#000";
    return bar
}


function getHPCStatus(hpc) {
    let hpcStatus = $("." + hpc.id.toLowerCase() + "-status");

    try {
        client.callback();
    } catch (e) {
        console.warn("Issue decoding the token");
    }

    var authorization = client.getToken();
    authorization.then((session) => {
        $.ajax({
            url: hpc.root_url,
            headers: {
                "Authorization": "Bearer " + session.access_token
            },
            type: "GET",
            timeout: 30000,
	        success: function(result, status, code) {
                console.log(hpc.id + " ajax get request result: " + code.status);
                hpcStatus.children(".sonar").children(".status-icon").addClass("ok");
                $("." + hpc.id.toLowerCase() + "-section").removeClass("disabled");
                $("." + hpc.id.toLowerCase() + "-section").addClass("enabled");
                $("." + hpc.id.toLowerCase() + "-button").prop("disabled", false);
            },
            error: function(error, status, code) {
                if (status == "timeout") {
		            showAlert("It's seems " + hpc.id + " is down. Check your internet connection or try again later.");
		        }
                console.warn(hpc.id + " ajax get request error: " + error.status);
                hpcStatus.children(".sonar").children(".status-icon").addClass("no");
                showAlert(hpc.id + " is not accessible at the moment.<br>Please try again later.");
            }
        }).always(() => {
            hpcStatus.children(".sonar").children(".sonar-wave").css("animation", "stop");
            hpcStatus.children(".sonar").children(".status-icon").css("animation", "loadedIcon 1s ease-out 1 forwards");
        });
    });
}


function getServiceAccountStatus(hpc) {
    let hpcSAStatus = $("." + hpc.id.toLowerCase() + "-sa-status");

    try {
        client.callback();
    } catch (e) {
        console.warn("Issue decoding the token");
    }

    var authorization = client.getToken();
    authorization.then((session) => {
        $.ajax({
            url: SERVICE_ACCOUNT_URL + "hpc/" + hpc.id.toLowerCase() + "/",
            headers: {
                "Authorization": "Bearer " + session.access_token
            },
            type: "GET",
            success: function(result, status, code) {
                console.log(hpc.id + " SA ajax get request result: " + code.status);
                hpcSAStatus.children(".sonar").children(".sa-status-icon").addClass("ok");
            },
            error: function(error, status, code) {
                console.warn(hpc["id"] + " SA ajax get request error: " + error.status);
                hpcSAStatus.children(".sonar").children(".sa-status-icon").addClass("no");
            }
        }).always(() => {
            hpcSAStatus.children(".sonar").children(".sonar-wave").css("animation", "stop");
            hpcSAStatus.children(".sonar").children(".sa-status-icon").css("animation", "loadedIcon 1s ease-out 1 forwards");
        });
    });
}


function updateSystemsStatus() {
    for (let i = 0; i < HPC_KEYS.length; i++) {
        let hpc = HPC_JSON[HPC_KEYS[i]];
        getHPCStatus(hpc);
        getServiceAccountStatus(hpc);
    }
}


async function onClickHpcSection(hpc) {
    closeAlert();
    let hpcSection = $("." + hpc.toLowerCase() + "-section");

    if (hpcSection.hasClass("enabled") && !hpcSection.is($(".hpc-section.selected"))) {
        $(".hpc-section").removeClass("selected");
        hpcSection.addClass("selected");

        $(".quota-label").html((hpc == "pizdaint" ? "Quota (node-h)" : "Quota (core-h)"));
        $(".quota-label.col-4").html((hpc == "pizdaint" ? "Quota<br>(node-h)" : "Quota<br>(core-h)"));

        $("#bottom-panel").addClass("fade-infinite");
        closeDetailsPanel();
        await sleep(500);
        $(".project-section").remove();

        for (let i = 0; i < HPC_KEYS.length; i++) {
            if (hpc.toUpperCase() == HPC_JSON[i].id) {
                getProjects(HPC_JSON[i]);
                break;
            }
        }

    }
}


function openDetailsPanel() {
    $("#bottom-panel").removeClass("fade-infinite");
    $("#details-panel").collapse("show");
    $(this).addClass("menu-wrapper-on");
    $(".menu-btn").addClass("menu-btn-on");
}


function closeDetailsPanel() {
    $("#details-panel").collapse("hide");
    $(this).removeClass("menu-wrapper-on");
    $(".menu-btn").removeClass("menu-btn-on");
}


function collapseDetailsPanel() {
    if ($("#details-panel").hasClass("show")) {
        closeDetailsPanel();
    } else {
        openDetailsPanel();
    }
}


async function showAlert(msg) {
    $("#alert").children()[1].innerHTML = msg;
    $("#alert-button").prop("disabled", false);
    $("#alert").addClass("fade-in");
    await sleep(5000);
    closeAlert();
}

async function closeAlert() {    
    $("#alert-button").prop("disabled", true);
    $("#alert").removeClass("fade-in");
    $("#alert").addClass("fade-out");
    await sleep(800);
    $("#alert").children()[1].innerHTML = "";
}


async function startApp() {
    console.log("startApp() called.");
    $(".body-loading").addClass("fade-out");
    $(".lds-roller").addClass("fade-out");
    await sleep(500);
    $(".body-loading").addClass("behind");
    $(".lds-roller").addClass("behind");
    updateSystemsStatus();
}


function login() {
    try {
        client.callback();
    } catch (e) {
        console.warn("Issue decoding the token");
    }
    var authorization = client.getToken();
    authorization.then((session) => {
        $.ajax({
            url: ROOT_SITE_URL + "/user",
            headers: {
                "Authorization": "Bearer " + session.access_token,
                "Context": "HPC"
            },
            type: "GET",
            success: function(data) {
                startApp();
            },
            error: function(data) {
                console.error("User not detected");
                showAlert("User not detected!");
                location.reload();
            }
        });
    });
}


const SERVICE_ACCOUNT_URL = "https://bspsa.cineca.it/";


var HPC_JSON = JSON.parse(decodeHTML(sessionStorage.getItem("hpc", hpc)));
var HPC_KEYS = Object.keys(HPC_JSON);


$(document).ready(() => {
    console.log("document ready!");
    login();
});


$(".menu-wrapper").on("click", () => {
    if (hpcContext != "") {
        collapseDetailsPanel();
    }
});


$(".details-text").on("click", () => {
    if (hpcContext != "") {
        collapseDetailsPanel();
    }
})


$(".reload-button").on("click", async function() {
    if (!$(".reload-button").hasClass("rotate")) {
        closeDetailsPanel();
        projects = []
        totalProject.quota = 0
        hpcContext = "";
        $(".reload-button").addClass("rotate");
        $(".project-section").remove();
        $(".hpc-section").removeClass("enabled");
        $(".hpc-section").removeClass("selected");
        $(".hpc-section").addClass("disabled");
        $(".status-icon, .sa-status-icon").removeClass("ok");
        $(".status-icon, .sa-status-icon").removeClass("no");
        $(".sonar-wave").css("animation", "sonarWave 1s linear infinite");
        $(".status-icon, .sa-status-icon").css("animation", "loadIcon 0.1s linear backwards");
        await sleep(300);
        updateSystemsStatus();
        await sleep(2000);
        $(".reload-button").removeClass("rotate");
    }
});

