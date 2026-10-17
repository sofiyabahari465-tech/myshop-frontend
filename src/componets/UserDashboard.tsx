import UserDashboardPage from '../pages/UserDashboardPage';
import type { Section } from '../types';

type UserDashboardProps = {
  activeSection?: Section;
};

const UserDashboard = ({
  activeSection = 'dashboard',
}: UserDashboardProps) => {
  return (
    <UserDashboardPage activeSection={activeSection} />
  );
};

export default UserDashboard;