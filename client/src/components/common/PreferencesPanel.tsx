import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  TextField,
  FormControl,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Slider,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  Tooltip,
  IconButton,
  Divider,
  CircularProgress,
  InputLabel,
  FormHelperText,
  Autocomplete,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import {
  ExpandMore,
  Info,
  RestoreRounded,
  Save,
  Visibility,
  VisibilityOff,
  Palette,
  Language,
  Notifications,
  Schedule,
  EventNote,
  Security,
  Accessibility,
  DeviceHub,
  CloudSync,
  SettingsApplications,
  Analytics,
  Person,
  Shield,
} from '@mui/icons-material';
import { PreferenceField, PreferenceCategory, UserPreferences } from '../../types';

interface PreferencesPanelProps {
  preferences: UserPreferences;
  onPreferencesChange: (preferences: Partial<UserPreferences>) => void;
  onSave: () => void;
  loading?: boolean;
  error?: string | null;
  success?: string | null;
  categories: PreferenceCategory[];
  fields: PreferenceField[];
  showAdvanced?: boolean;
}

const PreferencesPanel: React.FC<PreferencesPanelProps> = ({
  preferences,
  onPreferencesChange,
  onSave,
  loading = false,
  error,
  success,
  categories,
  fields,
  showAdvanced = false,
}) => {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Filter fields based on search and advanced settings
  const getFilteredFields = (categoryKey: string) => {
    return fields.filter((field) => {
      const matchesCategory = field.category === categoryKey;
      const matchesSearch = searchQuery === '' || 
        field.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        field.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesAdvanced = showAdvanced || !field.advanced;
      
      // Check dependencies
      let matchesDependencies = true;
      if (field.dependsOn) {
        const dependentValue = preferences[field.dependsOn.field as keyof UserPreferences];
        matchesDependencies = dependentValue === field.dependsOn.value;
      }
      
      return matchesCategory && matchesSearch && matchesAdvanced && matchesDependencies;
    });
  };

  // Validate field value
  const validateField = (field: PreferenceField, value: any): string | null => {
    if (field.validation) {
      if (field.validation.required && (!value || value === '')) {
        return field.validation.message || `${field.label} is required`;
      }
      
      if (field.validation.pattern && typeof value === 'string') {
        const regex = new RegExp(field.validation.pattern);
        if (!regex.test(value)) {
          return field.validation.message || `${field.label} format is invalid`;
        }
      }
      
      if (field.type === 'number' && typeof value === 'number') {
        if (field.min !== undefined && value < field.min) {
          return `${field.label} must be at least ${field.min}`;
        }
        if (field.max !== undefined && value > field.max) {
          return `${field.label} must be at most ${field.max}`;
        }
      }
    }
    return null;
  };

  // Handle field value change
  const handleFieldChange = (field: PreferenceField, value: any) => {
    const error = validateField(field, value);
    setValidationErrors(prev => ({
      ...prev,
      [field.key]: error || ''
    }));
    
    onPreferencesChange({ [field.key]: value });
  };

  // Reset field to default value
  const handleResetField = (field: PreferenceField) => {
    handleFieldChange(field, field.defaultValue);
  };

  // Render field based on type
  const renderField = (field: PreferenceField) => {
    const value = preferences[field.key as keyof UserPreferences] ?? field.defaultValue;
    const hasError = validationErrors[field.key];

    switch (field.type) {
      case 'switch':
        return (
          <FormControlLabel
            control={
              <Switch
                checked={Boolean(value)}
                onChange={(e) => handleFieldChange(field, e.target.checked)}
              />
            }
            label={field.label}
          />
        );

      case 'select':
        return (
          <FormControl fullWidth size="small" error={!!hasError}>
            <InputLabel>{field.label}</InputLabel>
            <Select
              value={value || ''}
              label={field.label}
              onChange={(e) => handleFieldChange(field, e.target.value)}
            >
              {field.options?.map((option) => (
                <MenuItem 
                  key={option.value.toString()} 
                  value={option.value.toString()}
                  disabled={option.disabled}
                >
                  {option.label}
                </MenuItem>
              ))}
            </Select>
            {hasError && <FormHelperText>{hasError}</FormHelperText>}
          </FormControl>
        );

      case 'multiselect':
        return (
          <Autocomplete
            multiple
            size="small"
            options={field.options || []}
            getOptionLabel={(option) => option.label}
            value={field.options?.filter(opt => Array.isArray(value) && value.includes(opt.value.toString())) || []}
            onChange={(_, newValue) => {
              handleFieldChange(field, newValue.map(v => v.value));
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label={field.label}
                error={!!hasError}
                helperText={hasError}
              />
            )}
            renderTags={(tagValue, getTagProps) =>
              tagValue.map((option, index) => (
                <Chip
                  label={option.label}
                  {...getTagProps({ index })}
                  size="small"
                  key={option.value.toString()}
                />
              ))
            }
          />
        );

      case 'number':
        return (
          <TextField
            fullWidth
            size="small"
            label={field.label}
            type="number"
            value={value || ''}
            onChange={(e) => handleFieldChange(field, Number(e.target.value))}
            inputProps={{
              min: field.min,
              max: field.max,
              step: field.step || 1,
            }}
            error={!!hasError}
            helperText={hasError}
          />
        );

      case 'text':
        return (
          <TextField
            fullWidth
            size="small"
            label={field.label}
            value={value || ''}
            onChange={(e) => handleFieldChange(field, e.target.value)}
            type={showPassword[field.key] ? 'text' : (field.key.toLowerCase().includes('password') || field.key.toLowerCase().includes('secret') ? 'password' : 'text')}
            error={!!hasError}
            helperText={hasError}
            InputProps={field.key.toLowerCase().includes('password') || field.key.toLowerCase().includes('secret') ? {
              endAdornment: (
                <IconButton
                  onClick={() => setShowPassword(prev => ({ ...prev, [field.key]: !prev[field.key] }))}
                  edge="end"
                  size="small"
                >
                  {showPassword[field.key] ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              )
            } : undefined}
          />
        );

      case 'time':
        return (
          <TextField
            fullWidth
            size="small"
            label={field.label}
            type="time"
            value={value || ''}
            onChange={(e) => handleFieldChange(field, e.target.value)}
            error={!!hasError}
            helperText={hasError}
            InputLabelProps={{
              shrink: true,
            }}
          />
        );

      case 'slider':
        return (
          <Box>
            <Typography variant="body2" gutterBottom>
              {field.label}: {typeof value === 'object' ? JSON.stringify(value) : String(value)}
            </Typography>
            <Slider
              value={typeof value === 'number' ? value : (field.min || 0)}
              onChange={(_, newValue) => handleFieldChange(field, newValue)}
              min={field.min || 0}
              max={field.max || 100}
              step={field.step || 1}
              marks
              valueLabelDisplay="auto"
            />
            {hasError && (
              <Typography variant="caption" color="error">
                {hasError}
              </Typography>
            )}
          </Box>
        );

      case 'color':
        return (
          <TextField
            fullWidth
            size="small"
            label={field.label}
            type="color"
            value={value || '#000000'}
            onChange={(e) => handleFieldChange(field, e.target.value)}
            error={!!hasError}
            helperText={hasError}
          />
        );

      default:
        return null;
    }
  };

  // Get icon for category
  const getCategoryIcon = (iconName: string) => {
    const iconMap: Record<string, React.ElementType> = {
      Language,
      Palette,
      Notifications,
      Schedule,
      EventNote,
      Analytics,
      Security,
      Person,
      Shield,
      Accessibility,
      DeviceHub,
      CloudSync,
      SettingsApplications,
    };
    
    const IconComponent = iconMap[iconName] || SettingsApplications;
    return <IconComponent />;
  };

  return (
    <Box>
      {/* Search and Controls */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField
          placeholder="Search preferences..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="small"
          sx={{ minWidth: 200, flexGrow: 1 }}
        />
        <Button
          variant="contained"
          startIcon={<Save />}
          onClick={onSave}
          disabled={loading || Object.values(validationErrors).some(error => error)}
        >
          {loading ? <CircularProgress size={20} /> : 'Save Preferences'}
        </Button>
      </Box>

      {/* Error and Success Messages */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      {/* Preference Categories */}
      {categories.map((category) => {
        const filteredFields = getFilteredFields(category.key);
        
        if (filteredFields.length === 0) return null;

        return (
          <Accordion
            key={category.key}
            expanded={expandedCategory === category.key}
            onChange={(_, isExpanded) => setExpandedCategory(isExpanded ? category.key : null)}
            sx={{ mb: 1 }}
          >
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {getCategoryIcon(category.icon)}
                <Box>
                  <Typography variant="h6">{category.label}</Typography>
                  {category.description && (
                    <Typography variant="body2" color="text.secondary">
                      {category.description}
                    </Typography>
                  )}
                </Box>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={3}>
                {filteredFields.map((field) => (
                  <Grid item xs={12} sm={6} md={4} key={field.key}>
                    <Card variant="outlined" sx={{ height: '100%' }}>
                      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                          <Box sx={{ flexGrow: 1 }}>
                            {field.type === 'switch' ? (
                              <Box>
                                {renderField(field)}
                                {field.description && (
                                  <Typography variant="caption" color="text.secondary" display="block">
                                    {field.description}
                                  </Typography>
                                )}
                              </Box>
                            ) : (
                              <Box>
                                {renderField(field)}
                                {field.description && (
                                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                                    {field.description}
                                  </Typography>
                                )}
                              </Box>
                            )}
                          </Box>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, ml: 1 }}>
                            {field.description && (
                              <Tooltip title={field.description}>
                                <IconButton size="small">
                                  <Info fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                            <Tooltip title="Reset to default">
                              <IconButton 
                                size="small" 
                                onClick={() => handleResetField(field)}
                              >
                                <RestoreRounded fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </Box>
                        {field.advanced && (
                          <Chip 
                            label="Advanced" 
                            size="small" 
                            color="primary" 
                            variant="outlined"
                            sx={{ mt: 1 }}
                          />
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </AccordionDetails>
          </Accordion>
        );
      })}
    </Box>
  );
};

export default PreferencesPanel; 