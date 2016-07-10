var searchBox = document.getElementsByClassName('search-box')[0];
var courseSearchResults = document.getElementsByClassName('course-search-results')[0];
var classSearchResults = document.getElementsByClassName('class-search-results')[0];
var contactInputs = document.getElementsByClassName('contact-input-box');
var emailInput = document.getElementsByName('email')[0];
var phoneNumberInput = document.getElementsByName('phonenumber')[0];
var yoNameInput = document.getElementsByName('yoname')[0];
var confirmClasses = document.getElementsByClassName('confirm-classes')[0];
var searchedClassRows = new Map(); // classes under the select step
var selectedCourseTables = new Map(); // courses under the confirm step
var selectedClassRows = new Map(); // classes under the confirm step
var noSelectedClassesWarning = document.getElementById("no-selected-classes-warning");
var noContactInfoWarning = document.getElementById("no-contact-info-warning");

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
    delay: 300,
    source: function(term, suggest){
        httpGetAsync('/api/courses?q=' + term, function(data){
            suggest(JSON.parse(data));
        });
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
                } else {
                    sel.classList.toggle('selected');
                    searchBox.value = searchBox.last_val; next = 0;
                }
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
        var classTableRow = createElement('tr');
        classTableRow.dataset.classId = klass.class_id;
        classTableRow.dataset.courseId = course.course_id;
        if (selectedClassRows.has(classTableRow.dataset.classId)) {
            classTableRow.className = 'selected';
        }
        classTableRow.onclick = onSearchedClassClick;

        var classType = createElement('td', 'class-type');
        classType.textContent = klass.type;
        classTableRow.appendChild(classType);

        var classTime = createElement('td', 'class-time');
        for (var i=0; i<klass.timeslots.length; i++) {
            var classTimeP = createElement('p');
            classTimeP.textContent = klass.timeslots[i].day + ' ' + klass.timeslots[i].start_time + '-' + klass.timeslots[i].end_time;
            classTime.appendChild(classTimeP);
        }
        classTableRow.appendChild(classTime);

        var classLocation = createElement('td', 'class-location');
        for (var i=0; i<klass.timeslots.length; i++) {
            var classLocationP = createElement('p');
            classLocationP.textContent = klass.timeslots[i].location;
            classLocation.appendChild(classLocationP);
        }
        classTableRow.appendChild(classLocation);

        var classStatus = createElement('td', 'class-status');
        classStatus.textContent = klass.status;
        classStatus.dataset.status = klass.status;
        classTableRow.appendChild(classStatus);

        var classEnrolled = createElement('td', 'class-enrolled');
        classEnrolled.textContent = klass.enrolled + '/' + klass.capacity;
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

    noSelectedClassesWarning.classList.add('hidden');
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


var contactVerificationDelay = 1500;

// oninput handlers for contact inputs
Array.prototype.forEach.call(contactInputs,
                             function(contactInput) {
                                 contactInput.oninput = function() {
                                     clearTimeout(contactInput.timer);
                                     clearOtherContactInputs(contactInput);
                                     contactInput.parentElement.classList.remove('valid', 'invalid');
                                     contactInput.parentElement.classList.add('verifying');
                                     var val = contactInput.value;
                                     var validationFunction;
                                     if (val.length >= 1) {
                                         switch(contactInput.name) {
                                            case 'email':
                                                validationFunction = validateEmail;
                                                break;
                                            case 'phonenumber':
                                                validationFunction = validatePhoneNumber;
                                                break;
                                            case 'yoname':
                                                validationFunction = validateYoName;
                                         }
                                         contactInput.timer = setTimeout(validationFunction, contactVerificationDelay);
                                     } else {
                                         contactInput.parentElement.classList.remove('valid', 'invalid', 'verifying');
                                     }
                                 };
                             }
);

function validateEmail() {
    var email = emailInput.value
    if (/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
        emailInput.parentElement.classList.remove('invalid', 'verifying');
        emailInput.parentElement.classList.add('valid');
        noContactInfoWarning.classList.add('hidden');
    } else {
        emailInput.parentElement.classList.remove('valid', 'verifying');
        emailInput.parentElement.classList.add('invalid');
    }
}

function validatePhoneNumber() {
    var phoneNumber = phoneNumberInput.value.replace(/[^0-9+]/g, '');
    if (/^(04|\+?614)\d{8}$/.test(phoneNumber)) {
        phoneNumberInput.value = phoneNumber;
        phoneNumberInput.parentElement.classList.remove('invalid', 'verifying');
        phoneNumberInput.parentElement.classList.add('valid');
        noContactInfoWarning.classList.add('hidden');
    } else {
        phoneNumberInput.parentElement.classList.remove('valid', 'verifying');
        phoneNumberInput.parentElement.classList.add('invalid');
    }
}

function validateYoName() {
    var yoName = yoNameInput.value;
    if (/^(\d|\w)+$/.test(yoName)) {
        httpGetAsync('/api/validateyoname?yoname=' + yoName, function(response) {
            if (yoNameInput.value != yoName) {
                // if they've changed the value since we started verifying
                return;
            }
            var exists = JSON.parse(response).exists;
            if (exists) {
                yoNameInput.value = yoName.toUpperCase();
                yoNameInput.parentElement.classList.remove('invalid', 'verifying');
                yoNameInput.parentElement.classList.add('valid');
                noContactInfoWarning.classList.add('hidden');
            } else {
                yoNameInput.parentElement.classList.remove('valid', 'verifying');
                yoNameInput.parentElement.classList.add('invalid');
            }
        });
    } else {
        yoNameInput.parentElement.classList.remove('valid', 'verifying');
        yoNameInput.parentElement.classList.add('invalid');
    }
}

function clearOtherContactInputs(chosenInput) {
    Array.prototype.forEach.call(contactInputs,
                                 function(contactInput) {
                                     if (contactInput != chosenInput) {
                                         clearTimeout(contactInput.timer);
                                         contactInput.value = '';
                                         contactInput.parentElement.classList.remove('valid', 'invalid', 'verifying');
                                     }
                                 }
    );
}


// onclick handler for submit button
document.getElementsByClassName('alert-me-button')[0].onclick = function() {
    var postData = {};
    var contactGiven = false;
    var error = false;

    //find the valid contact
    for(var i=0; i < contactInputs.length; i++) {
        var contactInput = contactInputs[i];
        if (contactInput.parentElement.classList.contains('valid')) {
            postData[contactInput.name] = contactInput.value;
            contactGiven = true;
            break;
        }
    }

    // make sure at least one class is selected
    if (selectedClassRows.size == 0) {
        noSelectedClassesWarning.classList.remove('hidden');
        window.location = "#confirm";
        error = true;
    }

    // make sure they entered a valid contact
    if (!contactGiven) {
        noContactInfoWarning.classList.remove('hidden');
        window.location = "#contact";
        error = true;
    }

    if (error) {
        return;
    }

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
