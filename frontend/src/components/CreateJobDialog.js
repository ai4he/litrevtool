import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Chip,
  IconButton,
  Switch,
  FormControlLabel,
  Divider,
} from '@mui/material';
import { Add as AddIcon, Close as CloseIcon } from '@mui/icons-material';

function CreateJobDialog({ open, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    name: '',
    keywords_include: [],
    keywords_exclude: [],
    start_year: '',
    end_year: '',
    use_semantic: false,
    semantic_inclusion: '',
    semantic_exclusion: '',
  });

  const [currentKeyword, setCurrentKeyword] = useState('');
  const [currentExclude, setCurrentExclude] = useState('');

  const handleAddKeyword = () => {
    if (currentKeyword.trim()) {
      setFormData({
        ...formData,
        keywords_include: [...formData.keywords_include, currentKeyword.trim()],
      });
      setCurrentKeyword('');
    }
  };

  const handleRemoveKeyword = (index) => {
    setFormData({
      ...formData,
      keywords_include: formData.keywords_include.filter((_, i) => i !== index),
    });
  };

  const handleAddExclude = () => {
    if (currentExclude.trim()) {
      setFormData({
        ...formData,
        keywords_exclude: [...formData.keywords_exclude, currentExclude.trim()],
      });
      setCurrentExclude('');
    }
  };

  const handleRemoveExclude = (index) => {
    setFormData({
      ...formData,
      keywords_exclude: formData.keywords_exclude.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = () => {
    if (!formData.name || formData.keywords_include.length === 0) {
      alert('Please provide a name and at least one inclusion keyword');
      return;
    }

    const jobData = {
      name: formData.name,
      keywords_include: formData.keywords_include,
      keywords_exclude: formData.keywords_exclude,
      start_year: formData.start_year ? parseInt(formData.start_year) : null,
      end_year: formData.end_year ? parseInt(formData.end_year) : null,
    };

    if (formData.use_semantic && (formData.semantic_inclusion || formData.semantic_exclusion)) {
      jobData.semantic_criteria = {
        inclusion: formData.semantic_inclusion || null,
        exclusion: formData.semantic_exclusion || null,
      };
    }

    onSubmit(jobData);
    handleReset();
  };

  const handleReset = () => {
    setFormData({
      name: '',
      keywords_include: [],
      keywords_exclude: [],
      start_year: '',
      end_year: '',
      use_semantic: false,
      semantic_inclusion: '',
      semantic_exclusion: '',
    });
    setCurrentKeyword('');
    setCurrentExclude('');
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Create New Search</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <TextField
            label="Search Name"
            fullWidth
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Machine Learning Papers 2020-2023"
            sx={{ mb: 3 }}
          />

          <Typography variant="subtitle2" gutterBottom>
            Inclusion Keywords (at least one required)
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <TextField
              size="small"
              fullWidth
              value={currentKeyword}
              onChange={(e) => setCurrentKeyword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddKeyword()}
              placeholder='e.g., "machine learning"'
            />
            <IconButton onClick={handleAddKeyword} color="primary">
              <AddIcon />
            </IconButton>
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
            {formData.keywords_include.map((keyword, index) => (
              <Chip
                key={index}
                label={keyword}
                onDelete={() => handleRemoveKeyword(index)}
                color="primary"
              />
            ))}
          </Box>

          <Typography variant="subtitle2" gutterBottom>
            Exclusion Keywords (optional)
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <TextField
              size="small"
              fullWidth
              value={currentExclude}
              onChange={(e) => setCurrentExclude(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddExclude()}
              placeholder='e.g., "medical"'
            />
            <IconButton onClick={handleAddExclude} color="secondary">
              <AddIcon />
            </IconButton>
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
            {formData.keywords_exclude.map((keyword, index) => (
              <Chip
                key={index}
                label={keyword}
                onDelete={() => handleRemoveExclude(index)}
                color="secondary"
              />
            ))}
          </Box>

          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <TextField
              label="Start Year (optional)"
              type="number"
              value={formData.start_year}
              onChange={(e) => setFormData({ ...formData, start_year: e.target.value })}
              placeholder="2020"
              sx={{ flex: 1 }}
            />
            <TextField
              label="End Year (optional)"
              type="number"
              value={formData.end_year}
              onChange={(e) => setFormData({ ...formData, end_year: e.target.value })}
              placeholder="2023"
              sx={{ flex: 1 }}
            />
          </Box>

          <Divider sx={{ my: 2 }} />

          <FormControlLabel
            control={
              <Switch
                checked={formData.use_semantic}
                onChange={(e) =>
                  setFormData({ ...formData, use_semantic: e.target.checked })
                }
              />
            }
            label="Use Semantic Filtering (powered by Google Gemini)"
          />

          {formData.use_semantic && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Semantic filtering uses AI to understand paper content beyond keywords
              </Typography>
              <TextField
                label="Semantic Inclusion Criteria (optional)"
                fullWidth
                multiline
                rows={2}
                value={formData.semantic_inclusion}
                onChange={(e) =>
                  setFormData({ ...formData, semantic_inclusion: e.target.value })
                }
                placeholder="e.g., papers with practical applications and case studies"
                sx={{ mb: 2 }}
              />
              <TextField
                label="Semantic Exclusion Criteria (optional)"
                fullWidth
                multiline
                rows={2}
                value={formData.semantic_exclusion}
                onChange={(e) =>
                  setFormData({ ...formData, semantic_exclusion: e.target.value })
                }
                placeholder="e.g., purely theoretical papers without experiments"
              />
            </Box>
          )}

          <Typography variant="caption" color="textSecondary" sx={{ mt: 2, display: 'block' }}>
            Note: The search will run in the background. You'll receive an email when it's complete.
            By splitting searches by year, we can extract more than 1000 papers total.
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained">
          Start Search
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default CreateJobDialog;
