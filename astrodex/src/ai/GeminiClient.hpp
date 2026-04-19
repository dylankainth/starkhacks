#pragma once

#include <string>
#include <optional>

namespace astrocore {

struct GeminiConfig {
    std::string api_key;
    std::string model = "gemini-3-flash-preview";
    int max_tokens = 4096;
    double temperature = 0.7;
};

class GeminiClient {
public:
    explicit GeminiClient(const GeminiConfig& config);
    ~GeminiClient();

    std::optional<std::string> query(const std::string& systemPrompt,
                                     const std::string& userPrompt);

    void setModel(const std::string& model);
    const std::string& getModel() const { return m_model; }

private:
    std::string m_apiKey;
    std::string m_model;
    int m_maxTokens;
    double m_temperature;
};

}  // namespace astrocore
