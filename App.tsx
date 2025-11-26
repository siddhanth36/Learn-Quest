import React from 'react';
import { Routes, Route } from 'react-router-dom';
import HomePage from './components/HomePage';
import Login from './components/Login';
import Signup from './components/Signup';
import Onboarding from './components/Onboarding';
import Dashboard from './components/Dashboard';
import TopicView from './components/TopicView'; // This now handles both notes and quizzes
import AIStudyBuddy from './components/AIStudyBuddy';
import Leaderboard from './components/Leaderboard';
import AdminDashboard from './components/AdminDashboard';
import SubjectRoadmap from './components/SubjectRoadmap';

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/subject/:curriculumId" element={<SubjectRoadmap />} />
      {/* This route now points to the combined notes & quiz view */}
      <Route path="/topic/:curriculumId/:unitIndex/:topicIndex" element={<TopicView />} />
      <Route path="/ai-buddy" element={<AIStudyBuddy />} />
      <Route path="/leaderboard" element={<Leaderboard />} />
      <Route path="/admin" element={<AdminDashboard />} />
    </Routes>
  );
};

export default App;