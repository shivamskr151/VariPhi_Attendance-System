import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Box,
  Divider,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Menu as MenuIcon,
  AccountCircle,
  Logout,
  Settings,
  Dashboard,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { RootState } from '../../store';
import { logout } from '../../store/slices/authSlice';

interface HeaderProps {
  onMenuClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    try {
      await dispatch(logout()).unwrap();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
    handleMenuClose();
  };

  const handleProfile = () => {
    navigate('/profile');
    handleMenuClose();
  };

  const handleSettings = () => {
    navigate('/settings');
    handleMenuClose();
  };

  const handleDashboard = () => {
    navigate('/dashboard');
    handleMenuClose();
  };

  // Debug: Log user data
  console.log('Header - User data:', user);
  console.log('Header - Profile picture URL:', user?.profilePicture ? `http://localhost:5001${user.profilePicture}` : 'No profile picture');

  return (
    <AppBar position="fixed" sx={{ zIndex: theme.zIndex.drawer + 1 }}>
      <Toolbar>
        {isMobile && onMenuClick && (
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={onMenuClick}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
        )}

        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          VariPhi Attendance System
        </Typography>

        {isAuthenticated && user && (
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' } }}>
              {user.firstName} {user.lastName}
            </Typography>
            
            <IconButton
              size="large"
              aria-label="account of current user"
              aria-controls="user-menu"
              aria-haspopup="true"
              onClick={handleMenuOpen}
              color="inherit"
            >
              {user.profilePicture ? (
                <Avatar 
                  src={`http://localhost:5001/api/users/profile-picture/${user.profilePicture?.split('/').pop()}`} 
                  alt={`${user.firstName} ${user.lastName}`}
                  sx={{ width: 32, height: 32 }}
                  onError={(e) => {
                    console.error('Header: Failed to load profile picture:', user.profilePicture);
                    console.error('Header: Full URL:', `http://localhost:5001/api/users/profile-picture/${user.profilePicture?.split('/').pop()}`);
                  }}
                />
              ) : (
                <AccountCircle />
              )}
            </IconButton>

            <Menu
              id="user-menu"
              anchorEl={anchorEl}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
            >
              <MenuItem onClick={handleDashboard}>
                <Dashboard sx={{ mr: 1 }} />
                Dashboard
              </MenuItem>
              
              <MenuItem onClick={handleProfile}>
                <AccountCircle sx={{ mr: 1 }} />
                Profile
              </MenuItem>
              
              <MenuItem onClick={handleSettings}>
                <Settings sx={{ mr: 1 }} />
                Settings
              </MenuItem>
              
              <Divider />
              
              <MenuItem onClick={handleLogout}>
                <Logout sx={{ mr: 1 }} />
                Logout
              </MenuItem>
            </Menu>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Header; 