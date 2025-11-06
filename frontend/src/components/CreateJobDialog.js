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
import { Add as AddIcon } from '@mui/icons-material';

function CreateJobDialog({ open, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    name: '',
    keywords_include: [],
    keywords_exclude: [],
    start_year: '',
    end_year: '',
    max_results: '',
    use_semantic: false,
    semantic_inclusion: '',
    semantic_exclusion: '',
    semantic_batch_mode: true,
    generate_latex: false,
  });

  const [currentKeyword, setCurrentKeyword] = useState('');
  const [currentExclude, setCurrentExclude] = useState('');

  // Keyword suggestions
  const inclusionSuggestions = ['large language models', 'mathematical reasoning'];
  const exclusionSuggestions = ['survey', 'review'];

  const handleAddSuggestion = (keyword, type) => {
    const list = type === 'include' ? formData.keywords_include : formData.keywords_exclude;
    // Don't add if already in the list
    if (!list.includes(keyword)) {
      if (type === 'include') {
        setFormData({
          ...formData,
          keywords_include: [...formData.keywords_include, keyword],
        });
      } else {
        setFormData({
          ...formData,
          keywords_exclude: [...formData.keywords_exclude, keyword],
        });
      }
    }
  };

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
      max_results: formData.max_results ? parseInt(formData.max_results) : null,
    };

    if (formData.use_semantic && (formData.semantic_inclusion || formData.semantic_exclusion)) {
      jobData.semantic_criteria = {
        inclusion: formData.semantic_inclusion || null,
        exclusion: formData.semantic_exclusion || null,
      };
      jobData.semantic_batch_mode = formData.semantic_batch_mode;
    }

    jobData.generate_latex = formData.generate_latex;

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
      max_results: '',
      use_semantic: false,
      semantic_inclusion: '',
      semantic_exclusion: '',
      semantic_batch_mode: true,
      generate_latex: false,
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
          <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
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
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="textSecondary" sx={{ mb: 0.5, display: 'block' }}>
              Suggestions (click to add):
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {inclusionSuggestions.map((suggestion, index) => (
                <Chip
                  key={index}
                  label={suggestion}
                  onClick={() => handleAddSuggestion(suggestion, 'include')}
                  variant="outlined"
                  color="primary"
                  size="small"
                  sx={{
                    cursor: 'pointer',
                    opacity: formData.keywords_include.includes(suggestion) ? 0.5 : 1,
                    '&:hover': { backgroundColor: 'rgba(25, 118, 210, 0.08)' }
                  }}
                  disabled={formData.keywords_include.includes(suggestion)}
                />
              ))}
            </Box>
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
          <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
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
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="textSecondary" sx={{ mb: 0.5, display: 'block' }}>
              Suggestions (click to add):
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {exclusionSuggestions.map((suggestion, index) => (
                <Chip
                  key={index}
                  label={suggestion}
                  onClick={() => handleAddSuggestion(suggestion, 'exclude')}
                  variant="outlined"
                  color="secondary"
                  size="small"
                  sx={{
                    cursor: 'pointer',
                    opacity: formData.keywords_exclude.includes(suggestion) ? 0.5 : 1,
                    '&:hover': { backgroundColor: 'rgba(211, 47, 47, 0.08)' }
                  }}
                  disabled={formData.keywords_exclude.includes(suggestion)}
                />
              ))}
            </Box>
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

          <TextField
            label="Maximum Results (optional)"
            type="number"
            fullWidth
            value={formData.max_results}
            onChange={(e) => setFormData({ ...formData, max_results: e.target.value })}
            placeholder="Leave empty to collect all available results"
            helperText="Limit the number of papers to collect. Leave empty for unlimited."
            sx={{ mb: 3 }}
          />

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
                sx={{ mb: 2 }}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.semantic_batch_mode}
                    onChange={(e) =>
                      setFormData({ ...formData, semantic_batch_mode: e.target.checked })
                    }
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2">
                      Batch Mode (Recommended)
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {formData.semantic_batch_mode
                        ? 'Analyzes papers in batches of 10 - faster and uses fewer API calls'
                        : 'Analyzes each paper individually - slower but more thorough'}
                    </Typography>
                  </Box>
                }
              />
            </Box>
          )}

          <Divider sx={{ my: 2 }} />

          <FormControlLabel
            control={
              <Switch
                checked={formData.generate_latex}
                onChange={(e) =>
                  setFormData({ ...formData, generate_latex: e.target.checked })
                }
              />
            }
            label={
              <Box>
                <Typography variant="body2">
                  Generate Research Paper (LaTeX)
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Automatically generate a systematic literature review document in LaTeX format with BibTeX citations
                </Typography>
              </Box>
            }
          />

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
