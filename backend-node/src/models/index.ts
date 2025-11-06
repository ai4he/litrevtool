import { User } from './User';
import { SearchJob } from './SearchJob';
import { Paper } from './Paper';

// Define associations
User.hasMany(SearchJob, {
  sourceKey: 'id',
  foreignKey: 'userId',
  as: 'searchJobs',
  onDelete: 'CASCADE',
});

SearchJob.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

SearchJob.hasMany(Paper, {
  sourceKey: 'id',
  foreignKey: 'searchJobId',
  as: 'papers',
  onDelete: 'CASCADE',
});

Paper.belongsTo(SearchJob, {
  foreignKey: 'searchJobId',
  as: 'searchJob',
});

export { User, SearchJob, Paper };
