# frozen_string_literal: true

require 'platform-api'

pr_number   = ENV.fetch('PR_NUMBER').to_i
pr_branch   = ENV.fetch('PR_BRANCH')
pipeline_id = ENV.fetch('HEROKU_PIPELINE_ID')
heroku      = PlatformAPI.connect_oauth(ENV.fetch('HEROKU_API_KEY'))

existing = heroku.review_app.list(pipeline_id).find { |ra| ra['pr_number'] == pr_number }
if existing
  puts "Deleting existing review app #{existing['id']}..."
  heroku.review_app.delete(existing['id'])
  sleep 15
end

response = heroku.review_app.create(
  pipeline: pipeline_id,
  branch: pr_branch,
  pr_number: pr_number,
)
puts "Review app created (#{response['status']}). Heroku will build, deploy, and run postdeploy."
