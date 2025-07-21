import React, { useState } from 'react';
import { Box, useTheme, useMediaQuery } from '@mui/material';
import Header from './Header';
import Sidebar from './Sidebar';

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleSidebarClose = () => {
    setSidebarOpen(false);
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Header onMenuClick={isMobile ? handleSidebarToggle : undefined} />
      
      <Sidebar 
        open={sidebarOpen} 
        onClose={handleSidebarClose} 
      />
      
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          mt: '64px', // Header height
          ml: { xs: 0, md: '240px' }, // Sidebar width on desktop
          minHeight: 'calc(100vh - 64px)',
          backgroundColor: theme.palette.background.default,
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default MainLayout; 