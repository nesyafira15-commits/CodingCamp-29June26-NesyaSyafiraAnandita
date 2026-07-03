# Requirements Document

## Introduction

The To-Do Life Dashboard is a single-page web application built with HTML, CSS, and Vanilla JavaScript. It provides a personal productivity hub accessible from any modern browser, requiring no backend server or external dependencies. All user data is persisted client-side via the browser's Local Storage API. The dashboard combines four core modules — a contextual greeting with live clock, a configurable Focus Timer (Pomodoro-style), a full-featured To-Do List, and a Quick Links launcher — alongside additional quality-of-life features such as light/dark mode, a custom user name, and task sorting.

---

## Glossary

- **Dashboard**: The single-page web application described in this document.
- **User**: The human interacting with the Dashboard through a browser.
- **Local_Storage**: The browser's `localStorage` API used to persist data client-side.
- **Greeting_Widget**: The UI section displaying the current time, date, and a time-based greeting message.
- **Focus_Timer**: The countdown timer widget implementing Pomodoro-style focused work sessions.
- **Session**: A single countdown interval started by the User on the Focus_Timer.
- **Task**: A single to-do item managed within the To-Do List widget.
- **Task_List**: The UI section containing all Tasks.
- **Quick_Links**: The UI section containing shortcut buttons that open saved URLs.
- **Link**: A single saved URL entry within Quick_Links.
- **Theme**: The visual color scheme of the Dashboard, either Light or Dark.
- **Settings_Panel**: The UI overlay or section where the User configures Dashboard preferences.

---

## Requirements

### Requirement 1: Live Clock and Date Display

**User Story:** As a User, I want to see the current time and date at a glance, so that I always know when I am without switching applications.

#### Acceptance Criteria

1. THE Greeting_Widget SHALL display the current time in HH:MM:SS 24-hour format, derived from the user's local system timezone, updated every second.
2. THE Greeting_Widget SHALL display the current date in the format "Weekday, DD Month YYYY" (e.g., Monday, 30 June 2025), derived from the user's local system timezone.
3. WHEN the browser tab transitions from a hidden state to a visible state, THE Greeting_Widget SHALL immediately synchronise the time and date display to the current local time without requiring a page reload.

---

### Requirement 2: Time-Based Greeting

**User Story:** As a User, I want to see a greeting that reflects the time of day, so that the Dashboard feels personal and contextually relevant.

#### Acceptance Criteria

1. WHEN the current local hour is between 05:00 and 11:59 inclusive, THE Greeting_Widget SHALL display the greeting "Good Morning".
2. WHEN the current local hour is between 12:00 and 17:59 inclusive, THE Greeting_Widget SHALL display the greeting "Good Afternoon".
3. WHEN the current local hour is between 18:00 and 21:59 inclusive, THE Greeting_Widget SHALL display the greeting "Good Evening".
4. WHEN the current local hour is between 22:00 and 04:59 (next day) inclusive, THE Greeting_Widget SHALL display the greeting "Good Night".
5. WHERE a custom name has been saved by the User, THE Greeting_Widget SHALL append the custom name to the greeting using the format "[Greeting], [Name]" with a comma-space separator (e.g., "Good Morning, Nesya"), truncated to a maximum of 50 characters for the name portion.
6. IF the saved custom name is empty or contains only whitespace characters, THEN THE Greeting_Widget SHALL display the greeting text without any name suffix.
7. IF the User attempts to save a name exceeding 50 characters, THEN THE Settings_Panel SHALL display a validation error and reject the value without saving.

---

### Requirement 3: Custom User Name

**User Story:** As a User, I want to set a custom name displayed in the greeting, so that the Dashboard feels personalized to me.

#### Acceptance Criteria

1. THE Settings_Panel SHALL provide an input field, with a maximum length of 50 characters, for the User to enter a custom name.
2. WHEN the User saves a custom name, THE Dashboard SHALL trim leading and trailing whitespace before persisting the name to Local_Storage; IF the trimmed value is empty, THE Dashboard SHALL save an empty string.
3. WHEN the Dashboard loads, THE Dashboard SHALL retrieve the saved custom name from Local_Storage and display it in the Greeting_Widget; IF no name is stored, THE Greeting_Widget SHALL display the greeting without a name suffix.
4. IF the User clears the custom name field and saves, THEN THE Greeting_Widget SHALL display the greeting without a name suffix.

---

### Requirement 4: Focus Timer — Core Countdown

**User Story:** As a User, I want a countdown timer for focused work sessions, so that I can apply the Pomodoro technique to improve my productivity.

#### Acceptance Criteria

1. THE Focus_Timer SHALL display the remaining time in MM:SS format, where the configured duration bounds the display between 01:00 and 99:00.
2. WHEN the User activates the Start control, THE Focus_Timer SHALL begin counting down from the configured duration, decrementing by one second each second.
3. WHEN the User activates the Stop control, THE Focus_Timer SHALL pause the countdown at the current remaining time.
4. WHEN the User activates the Reset control, THE Focus_Timer SHALL stop any active countdown and restore the display to the configured duration.
5. WHEN the countdown reaches 00:00, THE Focus_Timer SHALL stop automatically, freeze the display at 00:00, present a visible in-page notification and play an audible alert indicating the Session has ended, disable the Stop control, and enable the Start and Reset controls.
6. WHILE a Session is active, THE Focus_Timer SHALL disable the Start control and enable the Stop control.
7. WHILE no Session is active and time remains above 00:00, THE Focus_Timer SHALL enable the Start control and disable the Stop control.

---

### Requirement 5: Configurable Timer Duration

**User Story:** As a User, I want to change the focus session length, so that I can adapt the timer to my preferred work rhythm.

#### Acceptance Criteria

1. THE Settings_Panel SHALL provide an input field for the User to specify a timer duration in whole minutes, accepting values between 1 and 120 inclusive.
2. WHEN the User saves a new duration, THE Focus_Timer SHALL update the configured duration, stop any active countdown, and reset the display to the new value in a stopped state.
3. WHEN the User saves a new duration, THE Dashboard SHALL persist the duration value to Local_Storage.
4. WHEN the Dashboard loads, THE Focus_Timer SHALL retrieve the saved duration from Local_Storage and initialise the display to that value.
5. IF the saved duration is absent from Local_Storage, THEN THE Focus_Timer SHALL default to a duration of 25 minutes.
6. IF the User enters a non-numeric value, an empty value, or a numeric value outside the range 1–120, THEN THE Settings_Panel SHALL display a validation error message adjacent to the input field and reject the value without saving.
7. IF the User saves a new duration while a Session is active, THEN THE Focus_Timer SHALL stop the active session and reset the display to the new duration in a stopped state.

---

### Requirement 6: To-Do List — Add Tasks

**User Story:** As a User, I want to add tasks to my to-do list, so that I can track what I need to accomplish.

#### Acceptance Criteria

1. THE Task_List SHALL provide a text input field and an Add control for creating new Tasks.
2. WHEN the User submits a non-empty task description (after trimming leading and trailing whitespace) via the Add control or by pressing Enter, THE Task_List SHALL create a new Task with the trimmed description (maximum 200 characters) and append it to the list.
3. WHEN a new Task is created, THE Task_List SHALL persist the updated task collection to Local_Storage.
4. WHEN a new Task is created, THE Task_List SHALL clear the text input field.
5. IF the User attempts to submit an empty or whitespace-only task description, THEN THE Task_List SHALL not create a Task and SHALL display an inline validation message near the input field indicating the field is required.
6. IF the User attempts to add a task description that, after trimming, matches an existing Task description (case-insensitive comparison, regardless of completion status), THEN THE Task_List SHALL not create a duplicate Task and SHALL display an inline message near the input field notifying the User that the task already exists.

---

### Requirement 7: To-Do List — Edit Tasks

**User Story:** As a User, I want to edit an existing task's description, so that I can correct mistakes or update task details without deleting and recreating it.

#### Acceptance Criteria

1. THE Task_List SHALL provide an Edit control for each Task.
2. WHEN the User activates the Edit control for a Task, THE Task_List SHALL replace the task description display with an editable text field pre-populated with the current description.
3. WHEN the User confirms the edit (by pressing Enter or activating a Save control), THE Task_List SHALL trim leading and trailing whitespace from the new description, update the Task description (maximum 500 characters) with the trimmed value, and persist the change to Local_Storage.
4. WHEN the User cancels the edit (by pressing Escape or activating a Cancel control), THE Task_List SHALL restore the original description without making changes.
5. IF the User confirms an edit with an empty or whitespace-only description, THEN THE Task_List SHALL not save the change and SHALL display an inline error message near the edit field indicating the field is required.
6. IF the User confirms an edit with a trimmed description that matches another existing Task's description (case-insensitive comparison, excluding the task currently being edited), THEN THE Task_List SHALL not save the change and SHALL display an inline error message near the edit field notifying the User that the task already exists.
7. IF the Local_Storage write operation fails when saving an edit, THEN THE Task_List SHALL display an error notification and revert the task description to its pre-edit value.

---

### Requirement 8: To-Do List — Complete and Delete Tasks

**User Story:** As a User, I want to mark tasks as done and delete them, so that I can track my progress and keep my list clean.

#### Acceptance Criteria

1. THE Task_List SHALL provide a completion toggle (e.g., checkbox) for each Task.
2. WHEN the User activates the completion toggle for an incomplete Task, THE Task_List SHALL mark the Task as complete, apply a visual distinction (e.g., strikethrough), and persist the change to Local_Storage.
3. WHEN the User activates the completion toggle for a complete Task, THE Task_List SHALL mark the Task as incomplete, remove the visual distinction, and persist the change to Local_Storage.
4. THE Task_List SHALL provide a Delete control for each Task.
5. WHEN the User activates the Delete control for a Task, THE Task_List SHALL remove the Task from the list immediately without requiring a confirmation prompt, and persist the updated collection to Local_Storage.
6. IF a Local_Storage write operation fails following a toggle or delete action, THEN THE Task_List SHALL display an error notification and revert the Task to its state prior to the failed operation.

---

### Requirement 9: To-Do List — Sort Tasks

**User Story:** As a User, I want to sort my task list, so that I can prioritise my work and view tasks in a meaningful order.

#### Acceptance Criteria

1. THE Task_List SHALL provide a sort control offering at least the following options: by creation order (default), alphabetical ascending by task title (case-insensitive), alphabetical descending by task title (case-insensitive), completed last, and completed first.
2. WHEN the User selects a sort option, THE Task_List SHALL re-render the task list in the chosen order without altering the underlying data.
3. WHEN the Dashboard loads, THE Task_List SHALL retrieve tasks from Local_Storage and display them in the previously selected sort order; IF no sort preference is stored in Local_Storage, THE Task_List SHALL default to creation order.
4. WHEN the User selects a sort option, THE Dashboard SHALL persist the selected sort option to Local_Storage.

---

### Requirement 10: To-Do List — Data Persistence

**User Story:** As a User, I want my tasks to be saved automatically, so that I don't lose my list when I close or refresh the browser.

#### Acceptance Criteria

1. WHEN the Dashboard loads, THE Task_List SHALL retrieve all previously saved Tasks from Local_Storage and render them.
2. WHEN any Task is created, updated, completed, or deleted, THE Task_List SHALL write the full task collection to Local_Storage synchronously before the next UI render cycle.
3. IF Local_Storage contains no task data on load, THEN THE Task_List SHALL render an empty list with a visible empty-state message (e.g., "No tasks yet").
4. IF Local_Storage contains task data that cannot be parsed (e.g., corrupted JSON), THEN THE Task_List SHALL discard the unparseable data, initialise with an empty task collection, and display a visible error notification informing the User that saved tasks could not be loaded.

---

### Requirement 11: Quick Links — Add and Open Links

**User Story:** As a User, I want to save and launch favourite website shortcuts from the dashboard, so that I can reach commonly visited sites with a single click.

#### Acceptance Criteria

1. THE Quick_Links SHALL provide input fields for a link label and a URL, plus an Add control.
2. WHEN the User submits a valid label (non-empty, maximum 100 characters) and URL via the Add control, THE Quick_Links SHALL create a new Link button and persist the Link to Local_Storage.
3. WHEN the User activates a Link button, THE Dashboard SHALL open the associated URL in a new browser tab.
4. WHEN the Dashboard loads, THE Quick_Links SHALL retrieve all saved Links from Local_Storage and render them as buttons.
5. IF the User submits an empty label, THEN THE Quick_Links SHALL not create the Link and SHALL display an inline validation error adjacent to the label field; IF the User submits an invalid URL (not starting with http:// or https://), THEN THE Quick_Links SHALL not create the Link and SHALL display an inline validation error adjacent to the URL field; WHEN the User successfully resubmits with valid values, THE Quick_Links SHALL clear both error messages.

---

### Requirement 12: Quick Links — Delete Links

**User Story:** As a User, I want to remove saved links I no longer need, so that the Quick Links section stays relevant and uncluttered.

#### Acceptance Criteria

1. THE Quick_Links SHALL provide a Delete control for each Link.
2. WHEN the User activates the Delete control for a Link, THE Quick_Links SHALL display a confirmation prompt; IF the User confirms, THE Quick_Links SHALL remove the Link from the display and persist the updated link collection to Local_Storage; IF the User cancels, THE Quick_Links SHALL take no action.
3. IF the Local_Storage write operation fails when persisting the deletion, THEN THE Quick_Links SHALL display an error notification and restore the deleted Link to the display.

---

### Requirement 13: Light / Dark Mode Toggle

**User Story:** As a User, I want to switch between light and dark visual themes, so that I can use the Dashboard comfortably in different lighting conditions.

#### Acceptance Criteria

1. THE Dashboard SHALL provide a Theme toggle control that is always visible in the header or navigation bar, and the toggle SHALL visually indicate the currently active theme at all times.
2. WHEN the User activates the Theme toggle, THE Dashboard SHALL switch between the Light Theme and the Dark Theme.
3. WHEN the User changes the Theme, THE Dashboard SHALL persist the selected Theme to Local_Storage.
4. WHEN the Dashboard loads, THE Dashboard SHALL retrieve the saved Theme from Local_Storage and apply it before the page content is painted to the screen, preventing a flash of the wrong theme.
5. IF no Theme preference is saved in Local_Storage, THEN THE Dashboard SHALL check the OS-level color-scheme preference (prefers-color-scheme media query); IF the OS preference is dark, THE Dashboard SHALL apply the Dark Theme; OTHERWISE THE Dashboard SHALL apply the Light Theme by default.
6. IF Local_Storage is unavailable (e.g., private browsing mode or permissions denied), THEN THE Dashboard SHALL apply the Light Theme and the Theme toggle SHALL remain functional for the current session without persisting the preference.

---

### Requirement 14: Single-File Structure and Performance

**User Story:** As a User, I want the Dashboard to load quickly and be structured cleanly, so that it is easy to maintain and performs well.

#### Acceptance Criteria

1. THE Dashboard source code SHALL be organised into exactly one HTML entry file, one CSS file, and one JavaScript file, with no additional CSS or JavaScript files present in the project.
2. THE Dashboard SHALL load and render all UI components with no visible loading indicators within 2 seconds when accessed over a 25 Mbps broadband connection.
3. THE Dashboard SHALL produce a visible UI state change in response to all User interactions (button clicks, input events) within 100 milliseconds of the interaction occurring.
4. THE Dashboard SHALL deliver all functionality required for the Greeting_Widget, Focus_Timer, Task_List, Quick_Links, Theme toggle, and Settings_Panel without issuing any external network requests.
5. THE Dashboard SHALL render all widgets and controls without functional errors in the latest stable release of Chrome, Firefox, Edge, and Safari at the time of deployment, as verified by manual smoke testing in each browser.
