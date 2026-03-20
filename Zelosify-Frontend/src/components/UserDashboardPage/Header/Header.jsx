"use client";
import { memo, useEffect, useState, useRef } from "react";
import { Moon, Search, Sun } from "lucide-react";
import UserProfile from "./UserProfile";
import Notification from "./Notification";
import { useTheme } from "next-themes";

const Header = memo(({ isSidebarOpen }) => {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [showNotifications, setShowNotifications] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const notificationRef = useRef(null);
  const profileRef = useRef(null);

  // Unified function to close both when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Get current theme (Use resolvedTheme to correctly detect system theme)
  const currentTheme = theme === "system" ? resolvedTheme : theme;

  // Toggle Notifications
  const toggleNotifications = (e) => {
    e.stopPropagation();
    setShowNotifications((prev) => !prev);
    setIsProfileOpen(false); // Close profile if notification opens
  };

  // Toggle Profile
  const toggleProfile = (e) => {
    e.stopPropagation();
    setIsProfileOpen((prev) => !prev);
    setShowNotifications(false); // Close notifications if profile opens
  };

  return (
    <header
      className={`${
        isSidebarOpen ? "pl-[12rem]" : "pl-[5rem]"
      } h-16 flex items-center justify-between sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border`}
    >
      <div className="flex items-center justify-end px-6 w-full">
        {/* <div className="flex items-center gap-4 flex-1">
          <div className="hidden md:flex items-center max-w-md flex-1">
            <div className="relative w-full">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search"
                className="pl-8 pr-4 py-2 w-full border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>
        </div> */}

        <div className="flex items-center gap-2">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={currentTheme === "dark"}
              onChange={() =>
                setTheme(currentTheme === "dark" ? "light" : "dark")
              }
            />
            <div className="w-11 h-6 bg-muted border border-border rounded-full peer peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-background after:border after:border-border after:rounded-full after:h-5 after:w-5 after:transition-all after:shadow-sm">
              <span className="absolute left-1.5 top-1/2 transform -translate-y-1/2 z-10 flex items-center justify-center">
                <Moon className={`h-3 w-3 transition-opacity ${currentTheme === "dark" ? "opacity-100 text-muted-foreground" : "opacity-0"}`} />
              </span>
              <span className="absolute right-1.5 top-1/2 transform -translate-y-1/2 z-10 flex items-center justify-center">
                <Sun className={`h-3 w-3 transition-opacity ${currentTheme === "light" ? "opacity-100 text-muted-foreground" : "opacity-0"}`} />
              </span>
            </div>
          </label>

          {/* Bell Icon to Open Notifications */}
          {/* <div className="relative">
            <button
              onClick={toggleNotifications}
              className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <Bell className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full"></span>
            </button>
          </div> */}

          <UserProfile
            toggleNotifications={toggleNotifications}
            isProfileOpen={isProfileOpen}
            toggleProfile={toggleProfile}
            profileRef={profileRef}
          />
        </div>
      </div>

      {/* Notification Popup */}
      {showNotifications && (
        <Notification
          notificationRef={notificationRef}
          setShowNotifications={setShowNotifications}
        />
      )}
    </header>
  );
});

Header.displayName = "Header";
export default Header;
