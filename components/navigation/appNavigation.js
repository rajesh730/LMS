import {
  FaBell,
  FaBookOpen,
  FaBullhorn,
  FaBullseye,
  FaCalendarAlt,
  FaChalkboardTeacher,
  FaChartPie,
  FaCheckCircle,
  FaCog,
  FaCommentDots,
  FaFeatherAlt,
  FaGlobe,
  FaHeartbeat,
  FaHome,
  FaSchool,
  FaTrophy,
  FaUsers,
} from "react-icons/fa";

export const PUBLIC_NAV_LINKS = [
  { label: "Home", href: "/", key: "home", icon: FaHome },
  { label: "Schools", href: "/schools", key: "schools", icon: FaSchool },
  { label: "Events", href: "/events", key: "events", icon: FaCalendarAlt },
  { label: "Winners", href: "/winners", key: "winners", icon: FaTrophy },
];

export const ADMIN_NAV_LINKS = [
  { name: "Approvals", href: "/admin/dashboard?tab=approvals", icon: FaCheckCircle },
  { name: "Schools", href: "/admin/dashboard?tab=schools", icon: FaSchool },
  { name: "Platform Events", href: "/admin/dashboard?tab=events", icon: FaCalendarAlt },
  { name: "Notices", href: "/admin/dashboard?tab=notices", icon: FaBullhorn },
  { name: "School Spotlight", href: "/admin/dashboard?tab=spotlight", icon: FaBullseye },
  { name: "Diagnostics", href: "/admin/diagnostics", icon: FaHeartbeat },
  { name: "Feedback", href: "/admin/feedback", icon: FaCommentDots },
  { name: "Settings", href: "/admin/settings", icon: FaCog },
];

export const SCHOOL_NAV_LINKS = [
  { name: "Overview", href: "/school/dashboard", icon: FaChartPie },
  { name: "Students", href: "/school/dashboard?tab=students", icon: FaUsers },
  { name: "Teachers", href: "/school/dashboard?tab=teachers", icon: FaChalkboardTeacher },
  { name: "School Events", href: "/school/dashboard?tab=school-events", icon: FaCalendarAlt },
  { name: "Platform Events", href: "/school/dashboard?tab=platform-events", icon: FaGlobe },
  { name: "Student Notices", href: "/school/dashboard?tab=student-notices", icon: FaBell },
  { name: "Received Notices", href: "/school/dashboard?tab=notices", icon: FaBell },
  { name: "Publishing Desk", href: "/school/dashboard?tab=magazine", icon: FaBookOpen },
  { name: "Public Profile", href: "/school/dashboard?tab=showcase", icon: FaSchool },
  { name: "Feedback", href: "/school/dashboard?tab=feedback", icon: FaCommentDots },
  { name: "Settings", href: "/school/dashboard?tab=settings", icon: FaCog },
];

export const TEACHER_NAV_LINKS = [
  { name: "Mentor Workspace", href: "/teacher/dashboard", icon: FaChalkboardTeacher },
];

export const STUDENT_NAV_LINKS = [
  { name: "My Activity", href: "/student/dashboard", icon: FaSchool },
  { name: "Events", href: "/student/events", icon: FaCalendarAlt },
  { name: "Notices", href: "/student/notices", icon: FaBell },
  { name: "My Writing", href: "/student/writing", icon: FaFeatherAlt },
  { name: "School Wall", href: "/student/school-wall", icon: FaSchool },
  { name: "School Magazine", href: "/student/magazine", icon: FaBookOpen },
  { name: "Feedback", href: "/student/feedback", icon: FaCommentDots },
];

export const STUDENT_QUICK_NAV_LINKS = STUDENT_NAV_LINKS.filter((link) =>
  ["/student/school-wall", "/student/magazine", "/student/writing", "/student/events"].includes(
    link.href
  )
).map((link) => ({
  label: link.name === "School Magazine" ? "Magazine" : link.name,
  href: link.href,
  match: link.href,
  icon: link.icon,
}));

export function getRoleNavigationLinks(role) {
  if (role === "SUPER_ADMIN") return ADMIN_NAV_LINKS;
  if (role === "SCHOOL_ADMIN") return SCHOOL_NAV_LINKS;
  if (role === "TEACHER") return TEACHER_NAV_LINKS;
  if (role === "STUDENT") return STUDENT_NAV_LINKS;
  return [];
}
