var searchBox = document.getElementsByClassName('search-box')[0];
var courseSearchResults = document.getElementsByClassName('course-search-results')[0];
var classSearchResults = document.getElementsByClassName('class-search-results')[0];
var contactInputs = document.getElementsByClassName('contact-input-box');
var confirmClasses = document.getElementsByClassName('confirm-classes')[0];
var searchedClassRows = new Map(); // classes under the select step
var selectedCourseTables = new Map(); // courses under the confirm step
var selectedClassRows = new Map(); // classes under the confirm step

function createElement(type, klass) {
    // helper function that creates a DOM element of a certain type with the given classes
    var element = document.createElement(type);
    if (klass) {
        element.className = klass;
    }
    return element;
}

function httpGetAsync(theUrl, callback) {
    // helper function that does an async get request
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = function() {
        if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
            callback(xmlHttp.responseText);
    }
    xmlHttp.open("GET", theUrl, true); // true for asynchronous
    xmlHttp.send(null);
}

new autoComplete({
    selector: 'input[name="coursesearch"]',
    minChars: 2,
    delay: 500,
    source: function(term, suggest){
        if (term == '') {
            suggest([])
        } else {
            httpGetAsync('/api/courses?q=' + term, function(data){
                suggest(JSON.parse(data))
            });
        }
    },
    renderItem: function (item, search){
        var resultItem = createElement('li', 'course-search-result');
        resultItem.textContent = item.course_id + ' - ' + item.course_name;
        resultItem.dataset.courseId = item.course_id;
        courseSearchResults.appendChild(resultItem);
        return resultItem;
    },
    clearItems: function(){
        courseSearchResults.innerHTML = '';
    },
    onSelect: function() {
        httpGetAsync('/api/courses/' + this.dataset.courseId, classSearchResultsCallback);
        courseSearchResults.innerHTML = '';
        searchBox.value = this.textContent;
    },
    onControlKey: function(searchBox, key){
        if (key == 40 || key == 38) {
            //down, up keys
            var sel = courseSearchResults.querySelector('.course-search-result.selected');
            if (!sel) {
                next = (key == 40) ? courseSearchResults.childNodes[0] : courseSearchResults.childNodes[courseSearchResults.childNodes.length - 1];
                next.classList.toggle('selected');
                searchBox.value = next.textContent;
            } else {
                next = (key == 40) ? sel.nextSibling : sel.previousSibling;
                if (next) {
                    sel.classList.toggle('selected');
                    next.classList.toggle('selected');
                    searchBox.value = next.textContent;
                }
                else { sel.classList.toggle('selected'); searchBox.value = searchBox.last_val; next = 0; }
            }
        } else if (key == 9 || key == 13) {
            //enter key
            var sel = courseSearchResults.querySelector('.course-search-result.selected');
            if (sel) {
                sel.click();
            }
        }
    }
});

// onclick handler for searchbar
searchBox.onclick = onSearchBoxClick;
function onSearchBoxClick() {
    // when you click on the search box, all the text gets selected
    this.setSelectionRange(0, this.value.length);
}

function classSearchResultsCallback(course) {
    // shows all the classes from the selected course
    var course = JSON.parse(course);
    classSearchResults.innerHTML = '';
    searchedClassRows.clear();

    var courseTable = createElement('table', 'course-table');

    var courseTableTitle = createElement('caption');
    courseTableTitle.textContent = course.course_id;
    courseTable.appendChild(courseTableTitle);

    // adding all the classes to the class search results list
    course.classes.forEach(function(klass) {
        var classTableRow = createElement('tr', 'row');
        classTableRow.dataset.classId = klass.class_id;
        classTableRow.dataset.courseId = course.course_id;
        if (selectedClassRows.has(classTableRow.dataset.classId)) {
            classTableRow.className = 'row selected';
        }
        classTableRow.onclick = onSearchedClassClick;

        var classType = createElement('td', 'class-type');
        classType.textContent = klass.type;
        classType.dataset.type = klass.type;
        classTableRow.appendChild(classType);

        var classTime = createElement('td', 'class-time');
        if (klass.day != null) {
            classTime.textContent = klass.day + ' ' + klass.start_time + '-' + klass.end_time;
            classType.dataset.day = klass.day;
            classType.dataset.startTime = klass.start_time;
            classType.dataset.endTime = klass.end_time;
        }
        classTableRow.appendChild(classTime);

        var classLocation = createElement('td', 'class-location');
        classLocation.textContent = klass.location;
        classLocation.dataset.location = klass.location;
        classTableRow.appendChild(classLocation);

        var classStatus = createElement('td', 'class-status');
        classStatus.textContent = klass.status;
        classStatus.dataset.status = klass.status;
        classTableRow.appendChild(classStatus);

        var classEnrolled = createElement('td', 'class-enrolled');
        classEnrolled.textContent = klass.enrolled + '/' + klass.capacity;
        classEnrolled.dataset.enrolled = klass.enrolled;
        classEnrolled.dataset.capacity = klass.capacity;
        classEnrolled.dataset.percentage = klass.percentage;
        if (klass.percentage >= 100) {
            classEnrolled.classList.add("full");
        } else if (klass.percentage >= 80) {
            classEnrolled.classList.add("almost-full");
        }
        classTableRow.appendChild(classEnrolled);

        courseTable.appendChild(classTableRow);
        searchedClassRows.set(classTableRow.dataset.classId, classTableRow);
    })

    classSearchResults.appendChild(courseTable);
}

function checkSelectedCourseTableEmpty(courseId) {
    // checks if the table showing selected classes in a course is empty
    var selectedCourseTable = selectedCourseTables.get(courseId);
    if (selectedCourseTable.getElementsByTagName('tr').length == 0) {
        selectedCourseTables.delete(courseId);
        selectedCourseTable.remove();
    }
}

function onSearchedClassClick() {
    // clicking a class search result
    this.classList.toggle("selected");
    if (selectedClassRows.has(this.dataset.classId)) {
        // unselecting a class search result
        selectedClassRows.get(this.dataset.classId).remove();
        checkSelectedCourseTableEmpty(this.dataset.courseId);
        selectedClassRows.delete(this.dataset.classId);
    } else {
        // selecting a class search result

        // selecting the first class, remove the default message
        if (selectedClassRows.size == 0) {
            confirmClasses.innerHTML = '';
        }

        selectedClassRows.set(this.dataset.classId, this);
        var selectedCourseTable;
        if (selectedCourseTables.has(this.dataset.courseId)) {
            // selecting a class from a course that already has some other selected classes
            selectedCourseTable = selectedCourseTables.get(this.dataset.courseId);
        } else {
            // selecting a class from a course that has no other already selected classes
            selectedCourseTable = createElement('table', 'course-table');
            selectedCourseTables.set(this.dataset.courseId, selectedCourseTable);

            var courseTableTitle = createElement('caption');
            courseTableTitle.textContent = this.dataset.courseId;
            selectedCourseTable.appendChild(courseTableTitle);

            confirmClasses.appendChild(selectedCourseTable);
        }

        var selectedClassRow = this.cloneNode(deep=true);
        selectedClassRow.onclick = onSelectedClassClick;
        selectedCourseTable.appendChild(selectedClassRow);
        selectedClassRows.set(this.dataset.classId, selectedClassRow);
    }
}

function onSelectedClassClick() {
    // removing a selected class from the confirm list
    this.remove();
    checkSelectedCourseTableEmpty(this.dataset.courseId);
    selectedClassRows.delete(this.dataset.classId);
    if (searchedClassRows.has(this.dataset.classId)) {
        searchedClassRows.get(this.dataset.classId).classList.toggle("selected");
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
    postData.classids = Array.from(selectedClassRows.keys());

    var xhr = new XMLHttpRequest();
    xhr.open('post', '/api/alerts', true);
    xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');

    // send the collected data as JSON
    xhr.send(JSON.stringify(postData));

    xhr.onloadend = function (response) {
        document.write(response.target.response);
        window.scrollTo(0, 0);
    };
}
