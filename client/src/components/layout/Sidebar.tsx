import React from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Box,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Dashboard,
  Schedule,
  EventNote,
  People,
  Assessment,
  Settings,
  AdminPanelSettings,
  PendingActions,
  Person,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ open, onClose }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();
  
  const { user } = useSelector((state: RootState) => state.auth);
  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';

  const menuItems = [
    {
      text: 'Dashboard',
      icon: <Dashboard />,
      path: '/dashboard',
      roles: ['employee', 'manager', 'admin'],
    },
    {
      text: 'Attendance',
      icon: <Schedule />,
      path: '/attendance',
      roles: ['employee', 'manager', 'admin'],
    },
    {
      text: 'Leave Management',
      icon: <EventNote />,
      path: '/leaves',
      roles: ['employee', 'manager', 'admin'],
    },
    {
      text: 'Pending Leaves',
      icon: <PendingActions />,
      path: '/pending-leaves',
      roles: ['manager', 'admin'],
    },
    {
      text: 'Employees',
      icon: <People />,
      path: '/employees',
      roles: ['manager', 'admin'],
    },
    {
      text: 'Reports',
      icon: <Assessment />,
      path: '/reports',
      roles: ['manager', 'admin'],
    },
    {
      text: 'Admin Panel',
      icon: <AdminPanelSettings />,
      path: '/admin',
      roles: ['admin'],
    },
    {
      text: 'Settings',
      icon: <Settings />,
      path: '/settings',
      roles: ['employee', 'manager', 'admin'],
    },
    {
      text: 'Profile',
      icon: <Person />,
      path: '/profile',
      roles: ['employee', 'manager', 'admin'],
    },
  ];

  const handleNavigation = (path: string) => {
    navigate(path);
    if (isMobile) {
      onClose();
    }
  };

  const filteredMenuItems = menuItems.filter(item => 
    item.roles.includes(user?.role || 'employee')
  );

  const drawerContent = (
    <Box sx={{ width: 240 }}>
      <Box sx={{ p: 2 }}>
        <Box
          component="img"
          src="/logo192.png"
          alt="Logo"
          sx={{ height: 40, width: 'auto' }}
        />
      </Box>
      
      <Divider />
      
      <List>
        {filteredMenuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => handleNavigation(item.path)}
              sx={{
                '&.Mui-selected': {
                  backgroundColor: theme.palette.primary.light,
                  '&:hover': {
                    backgroundColor: theme.palette.primary.light,
                  },
                },
              }}
            >
              <ListItemIcon
                sx={{
                  color: location.pathname === item.path 
                    ? theme.palette.primary.main 
                    : 'inherit',
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText 
                primary={item.text}
                sx={{
                  '& .MuiListItemText-primary': {
                    color: location.pathname === item.path 
                      ? theme.palette.primary.main 
                      : 'inherit',
                    fontWeight: location.pathname === item.path ? 600 : 400,
                  },
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  if (isMobile) {
    return (
      <Drawer
        variant="temporary"
        open={open}
        onClose={onClose}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile.
        }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { 
            boxSizing: 'border-box', 
            width: 240 
          },
        }}
      >
        {drawerContent}
      </Drawer>
    );
  }

  return (
    <Drawer
      variant="permanent"
      sx={{
        display: { xs: 'none', md: 'block' },
        '& .MuiDrawer-paper': { 
          boxSizing: 'border-box', 
          width: 240 
        },
      }}
      open
    >
      {drawerContent}
    </Drawer>
  );
};

export default Sidebar; 