# frozen_string_literal: true

require 'cloudflare'
require 'platform-api'

SUBDOMAIN_PREFIXES = %w[demo my api].freeze
REVIEW_DOMAIN = ENV.fetch('FLIGHTLOGGER_DOMAIN_REVIEW', 'flightlogger-trail.net')

pr_number        = ENV.fetch('PR_NUMBER')
heroku_token     = ENV.fetch('HEROKU_API_KEY')
pipeline_id      = ENV.fetch('HEROKU_PIPELINE_ID')
cloudflare_token = ENV.fetch('CLOUDFLARE_API_TOKEN')

heroku = PlatformAPI.connect_oauth(heroku_token)
review_app = heroku.review_app.list(pipeline_id).find { |ra| ra['pr_number'] == pr_number.to_i }

unless review_app
  puts "No review app found for PR ##{pr_number} — nothing to destroy."
  exit
end

pr_pattern = /\A(#{SUBDOMAIN_PREFIXES.join('|')})-pr-#{pr_number}(-.+)?\.#{Regexp.escape(REVIEW_DOMAIN)}\z/

Cloudflare.connect(token: cloudflare_token) do |connection|
  zone = connection.zones.find_by_name(REVIEW_DOMAIN)
  abort "Cloudflare zone not found for #{REVIEW_DOMAIN}" unless zone

  zone.dns_records.each do |record|
    next unless record.name.match?(pr_pattern)

    puts "Deleting DNS record #{record.name}"
    record.delete
  end
end

heroku.review_app.delete(review_app['id'])
puts "Review app destroyed and DNS cleaned up for PR ##{pr_number}."
