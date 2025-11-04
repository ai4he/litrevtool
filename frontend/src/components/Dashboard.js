import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { jobsAPI } from '../services/api';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Button,
  Box,
  LinearProgress,
  Chip,
  IconButton,
  Alert,
  Collapse,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  PlayArrow as PlayArrowIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import CreateJobDialog from './CreateJobDialog';

function Dashboard() {
  const { user, logout } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [error, setError] = useState(null);
  const [jobPapers, setJobPapers] = useState({});
  const [expandedJobs, setExpandedJobs] = useState({});

  useEffect(() => {
    fetchJobs();
    // Poll for updates every 5 seconds
    const interval = setInterval(fetchJobs, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchJobs = async () => {
    try {
      const response = await jobsAPI.listJobs();
      setJobs(response.data.jobs);
      setError(null);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      setError('Failed to fetch jobs');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateJob = async (jobData) => {
    try {
      await jobsAPI.createJob(jobData);
      setOpenDialog(false);
      fetchJobs();
    } catch (error) {
      console.error('Error creating job:', error);
      setError('Failed to create job');
    }
  };

  const handleDeleteJob = async (jobId) => {
    if (window.confirm('Are you sure you want to delete this job?')) {
      try {
        await jobsAPI.deleteJob(jobId);
        fetchJobs();
      } catch (error) {
        console.error('Error deleting job:', error);
        setError('Failed to delete job');
      }
    }
  };

  const handleResumeJob = async (jobId) => {
    try {
      await jobsAPI.resumeJob(jobId);
      fetchJobs();
    } catch (error) {
      console.error('Error resuming job:', error);
      setError('Failed to resume job');
    }
  };

  const handleDownload = async (jobId, jobName) => {
    try {
      const response = await jobsAPI.downloadResults(jobId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${jobName.replace(/\s+/g, '_')}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error downloading results:', error);
      setError('Failed to download results');
    }
  };

  const fetchPapers = async (jobId) => {
    try {
      const response = await jobsAPI.getPapers(jobId);
      setJobPapers(prev => ({ ...prev, [jobId]: response.data.papers }));
    } catch (error) {
      console.error('Error fetching papers:', error);
    }
  };

  const toggleExpanded = (jobId) => {
    const isExpanding = !expandedJobs[jobId];
    setExpandedJobs(prev => ({ ...prev, [jobId]: isExpanding }));

    // Fetch papers when expanding if not already loaded
    if (isExpanding && !jobPapers[jobId]) {
      fetchPapers(jobId);
    }
  };

  // Fetch papers for running jobs automatically
  useEffect(() => {
    jobs.forEach(job => {
      if ((job.status === 'running' || job.status === 'completed') && expandedJobs[job.id]) {
        fetchPapers(job.id);
      }
    });
  }, [jobs]);

  const getStatusColor = (status) => {
    const colors = {
      pending: 'default',
      running: 'primary',
      completed: 'success',
      failed: 'error',
      paused: 'warning',
    };
    return colors[status] || 'default';
  };

  if (loading) {
    return (
      <Container>
        <Box sx={{ mt: 4 }}>
          <LinearProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4">Dashboard</Typography>
          <Box>
            <Button
              variant="outlined"
              sx={{ mr: 2 }}
              onClick={logout}
            >
              Logout
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setOpenDialog(true)}
            >
              New Search
            </Button>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Typography variant="h6" gutterBottom>
          Welcome, {user?.name || user?.email}
        </Typography>

        <Grid container spacing={3}>
          {jobs.length === 0 ? (
            <Grid item xs={12}>
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="h6" color="textSecondary">
                  No searches yet
                </Typography>
                <Typography variant="body2" color="textSecondary" paragraph>
                  Create your first search to extract papers from Google Scholar
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setOpenDialog(true)}
                >
                  Create First Search
                </Button>
              </Paper>
            </Grid>
          ) : (
            jobs.map((job) => (
              <Grid item xs={12} md={6} key={job.id}>
                <Paper sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                    <Typography variant="h6" sx={{ flexGrow: 1 }}>
                      {job.name}
                    </Typography>
                    <Chip
                      label={job.status}
                      color={getStatusColor(job.status)}
                      size="small"
                    />
                  </Box>

                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    Keywords: {job.keywords_include.join(', ')}
                  </Typography>

                  {(job.start_year || job.end_year) && (
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      Years: {job.start_year || '?'} - {job.end_year || '?'}
                    </Typography>
                  )}

                  {job.status === 'running' && (
                    <Box sx={{ mt: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2" fontWeight="bold">
                          Progress: {job.papers_processed} / {job.total_papers_found || '?'} papers
                        </Typography>
                        <Typography variant="body2" fontWeight="bold" color="primary">
                          {job.progress.toFixed(1)}%
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={job.progress}
                        sx={{
                          height: 8,
                          borderRadius: 1,
                          backgroundColor: 'rgba(0, 0, 0, 0.1)',
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 1,
                            background: 'linear-gradient(90deg, #1976d2 0%, #42a5f5 100%)',
                          }
                        }}
                      />

                      {/* Current Activity */}
                      {job.last_checkpoint && (
                        <Box sx={{ mt: 2, p: 1.5, backgroundColor: 'rgba(25, 118, 210, 0.08)', borderRadius: 1 }}>
                          <Typography variant="caption" color="primary" fontWeight="bold">
                            🔍 Currently Processing:
                          </Typography>
                          <Typography variant="body2" sx={{ mt: 0.5 }}>
                            {job.last_checkpoint.last_year_completed
                              ? `Year ${parseInt(job.last_checkpoint.last_year_completed) + 1}`
                              : 'Initializing...'}
                          </Typography>
                          {job.last_checkpoint.papers_collected && (
                            <Typography variant="caption" color="textSecondary">
                              📄 {job.last_checkpoint.papers_collected} papers collected so far
                            </Typography>
                          )}
                        </Box>
                      )}

                      {/* Time Estimation */}
                      <Box sx={{ mt: 1, display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="caption" color="textSecondary">
                          ⏱️ Started: {job.started_at ? new Date(job.started_at).toLocaleTimeString() : 'N/A'}
                        </Typography>
                        {job.progress > 0 && job.started_at && (
                          <Typography variant="caption" color="textSecondary">
                            ⏳ Est. remaining: {(() => {
                              const elapsed = Date.now() - new Date(job.started_at).getTime();
                              const rate = job.progress / elapsed;
                              const remaining = (100 - job.progress) / rate;
                              const minutes = Math.floor(remaining / 60000);
                              const seconds = Math.floor((remaining % 60000) / 1000);
                              return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
                            })()}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  )}

                  {job.status === 'completed' && (
                    <Typography variant="body2" color="success.main" sx={{ mt: 2 }}>
                      Found {job.total_papers_found} papers
                    </Typography>
                  )}

                  {job.status === 'failed' && job.error_message && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                      {job.error_message}
                    </Alert>
                  )}

                  <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                    {job.status === 'completed' && (
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<DownloadIcon />}
                        onClick={() => handleDownload(job.id, job.name)}
                      >
                        Download CSV
                      </Button>
                    )}

                    {job.status === 'failed' && (
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleResumeJob(job.id)}
                        title="Resume job"
                      >
                        <PlayArrowIcon />
                      </IconButton>
                    )}

                    {(job.status === 'running' || job.status === 'completed') && (
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={expandedJobs[job.id] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        onClick={() => toggleExpanded(job.id)}
                      >
                        {expandedJobs[job.id] ? 'Hide' : 'Show'} Papers ({jobPapers[job.id]?.length || 0})
                      </Button>
                    )}

                    <IconButton
                      size="small"
                      onClick={fetchJobs}
                      title="Refresh"
                    >
                      <RefreshIcon />
                    </IconButton>

                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDeleteJob(job.id)}
                      title="Delete"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>

                  {/* Papers List */}
                  <Collapse in={expandedJobs[job.id]} timeout="auto" unmountOnExit>
                    <Box sx={{ mt: 2 }}>
                      <Divider sx={{ mb: 2 }} />
                      <Typography variant="subtitle2" gutterBottom fontWeight="bold">
                        Extracted Papers
                      </Typography>
                      {jobPapers[job.id] && jobPapers[job.id].length > 0 ? (
                        <List dense sx={{ maxHeight: 400, overflow: 'auto', bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                          {jobPapers[job.id].map((paper, index) => (
                            <React.Fragment key={paper.id}>
                              {index > 0 && <Divider />}
                              <ListItem alignItems="flex-start">
                                <ListItemText
                                  primary={
                                    <Typography variant="body2" fontWeight="bold">
                                      {index + 1}. {paper.title}
                                    </Typography>
                                  }
                                  secondary={
                                    <Box component="span">
                                      {paper.authors && (
                                        <Typography variant="caption" display="block" color="textSecondary">
                                          {paper.authors}
                                        </Typography>
                                      )}
                                      {(paper.year || paper.source) && (
                                        <Typography variant="caption" display="block" color="textSecondary">
                                          {paper.year && `${paper.year}`}
                                          {paper.year && paper.source && ' • '}
                                          {paper.source}
                                        </Typography>
                                      )}
                                      {paper.citations !== null && paper.citations !== undefined && (
                                        <Typography variant="caption" display="block" color="primary">
                                          Cited by: {paper.citations}
                                        </Typography>
                                      )}
                                      {paper.url && (
                                        <Typography variant="caption" display="block">
                                          <a href={paper.url} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>
                                            🔗 Link
                                          </a>
                                        </Typography>
                                      )}
                                    </Box>
                                  }
                                />
                              </ListItem>
                            </React.Fragment>
                          ))}
                        </List>
                      ) : (
                        <Typography variant="body2" color="textSecondary" align="center" sx={{ p: 2 }}>
                          No papers extracted yet
                        </Typography>
                      )}
                    </Box>
                  </Collapse>

                  <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                    Created: {new Date(job.created_at).toLocaleString()}
                  </Typography>
                </Paper>
              </Grid>
            ))
          )}
        </Grid>
      </Box>

      <CreateJobDialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        onSubmit={handleCreateJob}
      />
    </Container>
  );
}

export default Dashboard;
