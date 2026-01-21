#!/usr/bin/env ruby

require 'csv'
require 'json'

result = []
Dir["*.tsv"].each do |tsv_file|
    CSV.foreach(tsv_file, col_sep: "\t", headers: true) do |row|
        eco, name, pgn = row.values_at("eco", "name", "pgn")

        result << { eco:, name:, pgn: }
    end
end

puts "Generated #{result.size} openings"

File.write("gen.json", JSON.pretty_generate(result))
