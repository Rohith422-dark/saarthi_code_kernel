import { Navigate, Route, Routes } from 'react-router-dom';
import Shell from './components/layout/Shell';
import { useApp } from './context/AppContext';
import Login, { LoginChooser } from './pages/Login';
import Dashboard from './pages/Dashboard';
import Diagnostic from './pages/Diagnostic';
import Path from './pages/Path';
import Practice from './pages/Practice';
import Tutor from './pages/Tutor';
import TeacherOverview from './pages/TeacherOverview';
import Students from './pages/Students';
import Alerts from './pages/Alerts';
import Resources from './pages/Resources';
import Activity from './pages/Activity';
import Contests from './pages/Contests';
import ContestRoom from './pages/ContestRoom';
import Leaderboard from './pages/Leaderboard';
import Messages from './pages/Messages';
import StudyMaterial from './pages/StudyMaterial';
import ExamCentre from './pages/ExamCentre';
import MockExam from './pages/MockExam';
import TeacherExams from './pages/TeacherExams';
import Homework from './pages/Homework';
import HomeworkRoom from './pages/HomeworkRoom';
import TeacherHomework from './pages/TeacherHomework';

const home = (p) => (p.role === 'teacher' ? '/teacher' : '/');

/** Signed-out visitors go to the sign-in page; people in the wrong area go back to their own. */
function Guard({ role, children }) {
  const { profile } = useApp();
  if (!profile) return <Navigate to={`/login${role ? `/${role}` : ''}`} replace />;
  if (role && profile.role !== role) return <Navigate to={home(profile)} replace />;
  return children;
}

export default function App() {
  const s = (el) => <Guard role="student">{el}</Guard>;
  const t = (el) => <Guard role="teacher">{el}</Guard>;
  return (
    <Routes>
      <Route path="login" element={<LoginChooser />} />
      <Route path="login/:role" element={<Login />} />
      <Route element={<Guard><Shell /></Guard>}>
        <Route index element={s(<Dashboard />)} />
        <Route path="diagnostic" element={s(<Diagnostic />)} />
        <Route path="path" element={s(<Path />)} />
        <Route path="practice/:conceptId?/:level?" element={s(<Practice />)} />
        <Route path="homework" element={s(<Homework />)} />
        <Route path="homework/:id" element={s(<HomeworkRoom />)} />
        <Route path="study-material" element={s(<StudyMaterial />)} />
        <Route path="exams" element={s(<ExamCentre />)} />
        <Route path="exams/mock/:id" element={s(<MockExam />)} />
        <Route path="tutor" element={s(<Tutor />)} />
        <Route path="contests" element={s(<Contests />)} />
        <Route path="contests/:id" element={s(<ContestRoom />)} />
        <Route path="leaderboard" element={s(<Leaderboard />)} />
        <Route path="messages" element={<Messages />} />
        <Route path="teacher" element={t(<TeacherOverview />)} />
        <Route path="teacher/students" element={t(<Students />)} />
        <Route path="teacher/exams" element={t(<TeacherExams />)} />
        <Route path="teacher/alerts" element={t(<Alerts />)} />
        <Route path="teacher/leaderboard" element={t(<Leaderboard />)} />
        <Route path="teacher/homework" element={t(<TeacherHomework />)} />
        <Route path="teacher/resources" element={t(<Resources />)} />
        <Route path="teacher/activity" element={t(<Activity />)} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
