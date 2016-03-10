var selectedClassIds = new Set();
var searchBox = document.getElementsByClassName('search-box')[0];
var courseSearchResults = document.getElementsByClassName('course-search-results')[0];
var classSearchResults = document.getElementsByClassName('class-search-results')[0];
var contactInputs = document.getElementsByClassName('contact-input-box');

function createElement(type, klass) {
    var element = document.createElement(type);
    element.className = klass;
    return element;
}

function httpGetAsync(theUrl, callback)
{
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = function() {
        if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
            callback(xmlHttp.responseText);
    }
    xmlHttp.open("GET", theUrl, true); // true for asynchronous
    xmlHttp.send(null);
}

// onkeyup handler for searchbar
searchBox.onkeyup = searchCourses;

function searchCourses() {
    var query = this.value;
    if (query == '') {
        courseSearchResults.innerHTML = '';
    } else {
        httpGetAsync('/api/course?q=' + query, courseSearchResultsCallback);
    }
}

// onclick handler for searchbar
searchBox.onclick = onSearchBoxClick;

function onSearchBoxClick() {
    this.setSelectionRange(0, this.value.length);
}

function courseSearchResultsCallback(results) {
    var results = JSON.parse(results);
    courseSearchResults.innerHTML = '';
    results.forEach(function(result) {
        var resultElement = createElement('li', 'course-search-result');
        resultElement.textContent = result.course_id + ' - ' + result.course_name;
        resultElement.dataset.courseId = result.course_id;
        resultElement.onclick = onCourseSearchResultClick;
        courseSearchResults.appendChild(resultElement);
    });
}

function onCourseSearchResultClick() {
    httpGetAsync('/api/course/' + this.dataset.courseId, classSearchResultsCallback);
    courseSearchResults.innerHTML = '';
    searchBox.value = this.textContent;
}

function classSearchResultsCallback(course) {
    var course = JSON.parse(course);
    console.log(course);
    classSearchResults.innerHTML = '';
    var courseClasses = createElement('div', 'course-classes');

    var courseClassesTitle = createElement('div', 'course-classes-title');
    courseClassesTitle.textContent = course.course_id;
    courseClasses.appendChild(courseClassesTitle);

    var courseClassesContainer = createElement('div');

    course.classes.forEach(function(klass) {
        var classInfos = createElement('div', 'class-infos row');
        classInfos.dataset.classId = klass.class_id;
        if (selectedClassIds.has(classInfos.dataset.classId)) {
            classInfos.className = 'class-infos row selected';
        }
        classInfos.onclick = classInfosOnClick;

        var classType = createElement('div', 'class-info class-type');
        classType.textContent = klass.type;
        classInfos.appendChild(classType);

        var classTime = createElement('div', 'class-info class-time');
        if (klass.day != null) {
            classTime.textContent = klass.day + ' ' + klass.start_time + '-' + klass.end_time;
        }
        classInfos.appendChild(classTime);

        var classLocation = createElement('div', 'class-info class-location');
        classLocation.textContent = klass.location;
        classInfos.appendChild(classLocation);

        var classStatus = createElement('div', 'class-info class-status');
        classStatus.textContent = klass.status;
        classInfos.appendChild(classStatus);

        var classEnrolled = createElement('div', 'class-info class-enrolled');
        classEnrolled.textContent = klass.enrolled + '/' + klass.capacity;
        classInfos.appendChild(classEnrolled);

        courseClassesContainer.appendChild(classInfos);
    })

    courseClasses.appendChild(courseClassesContainer);
    classSearchResults.appendChild(courseClasses);
}

/*
// onclick handlers for classinfos
Array.prototype.forEach.call(document.getElementsByClassName('class-infos'),
                             function(classInfo) {
                                 classInfo.onclick = classInfosOnClick;
                             }
);*/

function classInfosOnClick() {
    this.classList.toggle("selected");
    if (selectedClassIds.has(this.dataset.classId)) {
        selectedClassIds.delete(this.dataset.classId)
    } else {
        selectedClassIds.add(this.dataset.classId);
    }
    console.log(selectedClassIds);
}


// onkeyup handlers for contact inputs
Array.prototype.forEach.call(contactInputs,
                             function(contactInput) {
                                 contactInput.onkeyup = clearOtherContactInputs;
                             }
);

function clearOtherContactInputs() {
    Array.prototype.forEach.call(contactInputs,
                                 function(contactInput) {
                                     if (contactInput != this) {
                                         contactInput.value = '';
                                     }
                                 }
    );
}
