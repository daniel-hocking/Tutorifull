var searchBox = document.getElementsByClassName('search-box')[0];
var courseSearchResults = document.getElementsByClassName('course-search-results')[0];
var classSearchResults = document.getElementsByClassName('class-search-results')[0];
var contactInputs = document.getElementsByClassName('contact-input-box');
var confirmClasses = document.getElementsByClassName('confirm-classes')[0];
var searchedClassElements = new Map(); // classes under the select step
var selectedCourseElements = new Map(); // courses under the confirm step
var selectedClassElements = new Map(); // classes under the confirm step


function createElement(type, klass) {
    var element = document.createElement(type);
    if (klass) {
        element.className = klass;
    }
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
        httpGetAsync('/courses?q=' + query, courseSearchResultsCallback);
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
    // adding all the course search results to the dropdown under the searchbar
    results.forEach(function(result) {
        var resultElement = createElement('li', 'course-search-result');
        resultElement.textContent = result.course_id + ' - ' + result.course_name;
        resultElement.dataset.courseId = result.course_id;
        resultElement.onclick = onCourseSearchResultClick;
        courseSearchResults.appendChild(resultElement);
    });
}

function onCourseSearchResultClick() {
    httpGetAsync('/courses/' + this.dataset.courseId, classSearchResultsCallback);
    courseSearchResults.innerHTML = '';
    searchBox.value = this.textContent;
}

function classSearchResultsCallback(course) {
    var course = JSON.parse(course);
    classSearchResults.innerHTML = '';
    searchedClassElements.clear();
    var courseClasses = createElement('div', 'course-classes');

    var courseClassesTitle = createElement('div', 'course-classes-title');
    courseClassesTitle.textContent = course.course_id;
    courseClasses.appendChild(courseClassesTitle);

    var courseClassesContainer = createElement('div');

    // adding all the classes to the class search results list
    course.classes.forEach(function(klass) {
        var classInfos = createElement('div', 'class-infos row');
        classInfos.dataset.classId = klass.class_id;
        classInfos.dataset.courseId = course.course_id;
        if (selectedClassElements.has(classInfos.dataset.classId)) {
            classInfos.className = 'class-infos row selected';
        }
        classInfos.onclick = onSearchedClassInfosClick;

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
        searchedClassElements.set(classInfos.dataset.classId, classInfos);
    })

    courseClasses.appendChild(courseClassesContainer);
    classSearchResults.appendChild(courseClasses);
}

function checkSelectedCourseElementEmpty(courseId) {
    var selectedCourseElement = selectedCourseElements.get(courseId);
    var courseClassesContainer = selectedCourseElement.getElementsByTagName('div')[1];
    if (courseClassesContainer.children.length == 0) {
        selectedCourseElements.delete(courseId);
        selectedCourseElement.remove();
    }
}

function onSearchedClassInfosClick() {
    this.classList.toggle("selected");
    if (selectedClassElements.has(this.dataset.classId)) {
        // unselecting a class search result
        selectedClassElements.get(this.dataset.classId).remove();
        checkSelectedCourseElementEmpty(this.dataset.courseId);
        selectedClassElements.delete(this.dataset.classId);
    } else {
        // selecting a class search result

        // selecting the first class, remove the default message
        if (selectedClassElements.size == 0) {
            confirmClasses.innerHTML = '';
        }

        selectedClassElements.set(this.dataset.classId, this);
        var selectedCourseElement;
        if (selectedCourseElements.has(this.dataset.courseId)) {
            // selecting a class from a course that already has some other selected classes
            selectedCourseElement = selectedCourseElements.get(this.dataset.courseId);
        } else {
            // selecting a class from a course that has no other already selected classes
            selectedCourseElement = createElement('div', 'course-classes');
            selectedCourseElements.set(this.dataset.courseId, selectedCourseElement);

            var courseClassesTitle = createElement('div', 'course-classes-title');
            courseClassesTitle.textContent = this.dataset.courseId;
            selectedCourseElement.appendChild(courseClassesTitle);

            var courseClassesContainer = createElement('div');
            selectedCourseElement.appendChild(courseClassesContainer);

            confirmClasses.appendChild(selectedCourseElement);
        }

        var courseClassesContainer = selectedCourseElement.getElementsByTagName('div')[1];
        var selectedClassElement = this.cloneNode(deep=true);
        selectedClassElement.onclick = onSelectedClassInfosClick;
        courseClassesContainer.appendChild(selectedClassElement);
        selectedClassElements.set(this.dataset.classId, selectedClassElement);
    }
}

function onSelectedClassInfosClick() {
    // removing a selected class from the confirm list
    this.remove();
    checkSelectedCourseElementEmpty(this.dataset.courseId);
    selectedClassElements.delete(this.dataset.classId);
    if (searchedClassElements.has(this.dataset.classId)) {
        searchedClassElements.get(this.dataset.classId).classList.toggle("selected");
    }
}



// onkeyup handlers for contact inputs
Array.prototype.forEach.call(contactInputs,
                             function(contactInput) {
                                 contactInput.onkeyup = clearOtherContactInputs;
                             }
);

function clearOtherContactInputs() {
    var chosenInput = this;
    Array.prototype.forEach.call(contactInputs,
                                 function(contactInput) {
                                     if (contactInput != chosenInput) {
                                         contactInput.value = '';
                                     }
                                 }
    );
}

// onclick handler for submit button
document.getElementsByClassName('alert-me-button')[0].onclick = function() {
    //TODO: validate email, phone, yo
    var postData = {};
    Array.prototype.forEach.call(contactInputs,
                                 function(contactInput) {
                                     if (contactInput.value) {
                                         postData[contactInput.name] = contactInput.value;
                                     }
                                 }
    );
    postData.classids = Array.from(selectedClassElements.keys());

    var xhr = new XMLHttpRequest();
    xhr.open('post', '/alerts', true);
    xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');

    // send the collected data as JSON
    xhr.send(JSON.stringify(postData));

    xhr.onloadend = function (response) {
        document.write(response.target.response);
    };
}
