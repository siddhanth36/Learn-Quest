# LearnQuest — Gamified Education Platform

## Project Overview

LearnQuest is a modern, interactive, and gamified learning platform designed to transform education into an engaging adventure. Students earn XP, badges, and streaks as they progress through subjects, while administrators can easily upload syllabus content which our AI then structures into missions, complete with detailed notes and interactive quizzes.

## Features

*   **Gamified Learning Experience**: Earn Experience Points (XP), level up, maintain daily streaks, and unlock achievements as you learn.
*   **AI-Powered Curriculum Generation**: Admins can upload raw syllabus text (e.g., from a PDF or manual entry). Our intelligent AI (powered by Google Gemini) automatically structures it into units and topics, generates comprehensive study notes in HTML format, and creates multiple-choice quizzes for each topic.
*   **Personalized AI Study Buddy**: A 24/7 AI assistant ready to answer questions, provide explanations, and offer help on any academic subject.
*   **Interactive Quizzes**: Test your knowledge with engaging quizzes for each topic, designed to reinforce learning and provide instant feedback.
*   **Subject Roadmaps**: Visualize your learning journey with clear roadmaps for each subject, showing completed and upcoming topics.
*   **Leaderboards & Achievements**: Compete with friends, track your progress on a global leaderboard, and earn unique badges for your accomplishments.
*   **Student Dashboard**: A personalized hub to track XP, level, streak, achievements, and progress across all enrolled subjects.
*   **Admin Dashboard**: A dedicated interface for administrators to upload new curricula, manage existing subjects, and monitor the AI content generation process.
*   **PDF Notes Download**: Download study notes for any topic as a PDF for offline access.

## Technologies Used

*   **Frontend**: React, TypeScript, Tailwind CSS
*   **Animations**: Framer Motion
*   **Backend & Database**: Firebase (Authentication, Firestore Database, Cloud Functions, Hosting)
*   **AI Integration**: Google Gemini API (`@google/genai`) via Firebase Cloud Functions
*   **PDF Generation**: `html2pdf.js`

## Installation and Setup

Follow these steps to get LearnQuest up and running on your local machine.

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/learnquest.git # Replace with your repo URL
cd learnquest
```

### 2. Install Frontend Dependencies

```bash
npm install
```

### 3. Set Up Firebase Project

LearnQuest relies heavily on Firebase. You'll need to set up a project in the Firebase Console.

1.  **Create a Firebase Project**:
    *   Go to the [Firebase Console](https://console.firebase.google.com/).
    *   Click "Add project" and follow the prompts.
2.  **Enable Firebase Services**:
    *   **Authentication**: In your Firebase project, navigate to "Authentication" -> "Sign-in method". Enable "Email/Password" and "Google" sign-in providers.
    *   **Firestore Database**: Navigate to "Firestore Database" -> "Create database". Start in "production mode" and choose a location.
    *   **Cloud Functions**: Go to "Functions" and ensure it's enabled.
    *   **Storage**: Go to "Storage" and ensure it's enabled.
3.  **Firebase Project Configuration (Frontend)**:
    *   In the Firebase Console, go to "Project settings" (the gear icon next to "Project overview").
    *   Under "Your apps", click on the "</>" web icon to register a new web app. Follow the steps, and Firebase will provide you with a configuration object.
    *   Open `firebase.ts` in your project root and replace the placeholder values in `firebaseConfig` with your actual Firebase project configuration.

    ```typescript
    // firebase.ts
    const firebaseConfig = {
      apiKey: "YOUR_FIREBASE_API_KEY",
      authDomain: "YOUR_AUTH_DOMAIN",
      projectId: "YOUR_PROJECT_ID",
      storageBucket: "YOUR_STORAGE_BUCKET",
      messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
      appId: "YOUR_APP_ID",
      measurementId: "YOUR_MEASUREMENT_ID"
    };
    ```
    *   **Important:** For production deployments, you should use environment variables (e.g., `.env.local` for Vite) to store these keys and not hardcode them in your repository. For this exercise, we've used placeholders as requested.

### 4. Configure Google Gemini API Key (Cloud Functions)

The AI functionality is powered by the Google Gemini API, called securely via Firebase Cloud Functions.

1.  **Generate a Gemini API Key**:
    *   Go to [Google AI Studio](https://aistudio.google.com/app/apikey).
    *   Click "Create API key in new project" (or use an existing project).
    *   **Enable billing**: To use more powerful models like `gemini-3-pro-preview` for content and quiz generation, you **must enable billing** for your Google Cloud Project associated with your Firebase project. Refer to the [Gemini API billing documentation](https://ai.google.dev/gemini-api/docs/billing).
2.  **Set as Firebase Secret**:
    *   Navigate to the `functions` directory:
        ```bash
        cd functions
        ```
    *   Install function dependencies:
        ```bash
        npm install
        ```
    *   Set your Gemini API key as a Firebase Secret. This keeps your API key secure and out of your codebase.
        ```bash
        firebase functions:secrets:set GEMINI_API_KEY
        ```
        When prompted, paste your Gemini API key.
    *   Ensure that the `FIREBASE_FUNCTION_URL` in `components/utils.ts` is updated with your Firebase Project ID. You can find this in your Firebase project settings.
        ```typescript
        // components/utils.ts
        const FIREBASE_FUNCTION_URL = "https://YOUR_FIREBASE_PROJECT_ID.cloudfunctions.net/generateAIResponse";
        ```

### 5. Deploy Firebase Functions

After setting up the Gemini API key as a secret, deploy your Cloud Functions:

1.  Make sure you are in the `functions` directory (`cd functions`).
2.  Build the TypeScript functions:
    ```bash
    npm run build
    ```
3.  Deploy your functions to Firebase:
    ```bash
    firebase deploy --only functions
    ```
    This command will make the `generateAIResponse` function available.

### 6. Run the Frontend Application

1.  Navigate back to the project root directory:
    ```bash
    cd ..
    ```
2.  Start the development server:
    ```bash
    npm run dev
    ```
    Your application should now be running on `http://localhost:5173` (or another port if 5173 is in use).

## Usage

### For Students

1.  **Sign Up**: Create an account using email/password or Google.
2.  **Onboarding**: Complete the onboarding process by selecting your education board, class/semester, and subjects of interest.
3.  **Dashboard**: View your progress, XP, level, streak, and achievements.
4.  **Subject Roadmaps**: Navigate to a subject roadmap to see units and topics.
5.  **Learn Topics**: Click on an "Active" topic to view study notes. You can also download notes as a PDF.
6.  **Take Quizzes**: After reviewing notes, start the quiz to earn XP and progress.
7.  **AI Study Buddy**: Use the AI Study Buddy for instant help and answers to your questions.
8.  **Leaderboard**: Check your rank and compare with other students.

### For Administrators

1.  **Admin Account**: Currently, user roles (`student` or `admin`) are set during signup. To get an admin account, you would typically register as a student and then manually update your `role` field in the Firestore `users` collection to `'admin'`.
2.  **Login**: Log in with your admin account. The system will redirect you to the Admin Dashboard.
3.  **Upload Curriculum**:
    *   Select the Education Board, Class/Semester, and Subject.
    *   Paste the raw syllabus text into the "Syllabus Content" textarea.
    *   Click "🤖 Generate Notes with AI". The AI will first structure the syllabus into units and topics, then generate detailed notes and quizzes for each. This process may take a few moments.
    *   Review the "AI Generated Preview".
    *   Click "✅ Save Curriculum" to save it to the database.
4.  **Manage Curriculums**: View all uploaded curricula, and delete them if necessary.

## Customizing AI Models

The Firebase Cloud Function dynamically selects models based on the `promptType`:

*   **`study_buddy`**: Uses `gemini-2.5-flash` for basic conversational tasks.
*   **`syllabus_structure`, `notes_generation`, `quiz_generation`**: Use `gemini-3-pro-preview` for more complex reasoning and content generation tasks.

You can modify these model selections in `functions/src/index.ts` to use different Gemini models as needed, or update `_YOUR_AI_MODEL` to a specific model if you want a single model for all tasks, ensuring it is a suitable model for the task types. For detailed model information, refer to the [Gemini API documentation](https://ai.google.dev/models).

## Contribution

(Add guidelines for contributing to the project here, e.g., how to submit bug reports, feature requests, or pull requests.)

## License

(Specify the license under which your project is distributed, e.g., MIT, Apache 2.0, etc.)
