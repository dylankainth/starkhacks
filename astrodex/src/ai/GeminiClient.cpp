#include "ai/GeminiClient.hpp"
#include "core/Logger.hpp"
#include <curl/curl.h>
#include <nlohmann/json.hpp>
#include <chrono>

namespace astrocore {

static size_t WriteCallback(void* contents, size_t size, size_t nmemb, std::string* userp) {
    userp->append(static_cast<char*>(contents), size * nmemb);
    return size * nmemb;
}

GeminiClient::GeminiClient(const GeminiConfig& config)
    : m_apiKey(config.api_key)
    , m_model(config.model)
    , m_maxTokens(config.max_tokens)
    , m_temperature(config.temperature)
{
    LOG_INFO("Gemini client initialized with model: {}", m_model);
}

GeminiClient::~GeminiClient() = default;

void GeminiClient::setModel(const std::string& model) {
    m_model = model;
    LOG_INFO("Gemini model changed to: {}", m_model);
}

std::optional<std::string> GeminiClient::query(const std::string& systemPrompt,
                                                const std::string& userPrompt) {
    auto startTime = std::chrono::high_resolution_clock::now();

    CURL* curl = curl_easy_init();
    if (!curl) {
        LOG_ERROR("Failed to initialize CURL for Gemini");
        return std::nullopt;
    }

    // Gemini REST API: POST /v1beta/models/{model}:generateContent?key={key}
    std::string url = "https://generativelanguage.googleapis.com/v1beta/models/"
                    + m_model + ":generateContent?key=" + m_apiKey;

    nlohmann::json requestBody;
    requestBody["systemInstruction"] = {
        {"parts", {{{"text", systemPrompt}}}}
    };
    requestBody["contents"] = {{
        {"role", "user"},
        {"parts", {{{"text", userPrompt}}}}
    }};
    requestBody["generationConfig"] = {
        {"maxOutputTokens", m_maxTokens},
        {"temperature", m_temperature}
    };

    std::string requestStr = requestBody.dump();
    std::string response;

    struct curl_slist* headers = nullptr;
    headers = curl_slist_append(headers, "Content-Type: application/json");

    curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, requestStr.c_str());
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, WriteCallback);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, &response);
    curl_easy_setopt(curl, CURLOPT_TIMEOUT, 30L);

    CURLcode res = curl_easy_perform(curl);

    auto endTime = std::chrono::high_resolution_clock::now();
    double latencyMs = std::chrono::duration<double, std::milli>(endTime - startTime).count();

    curl_slist_free_all(headers);
    curl_easy_cleanup(curl);

    if (res != CURLE_OK) {
        LOG_ERROR("Gemini request failed: {}", curl_easy_strerror(res));
        return std::nullopt;
    }

    try {
        auto json = nlohmann::json::parse(response);

        if (json.contains("error")) {
            std::string errMsg = json["error"].value("message", "Unknown error");
            LOG_ERROR("Gemini API error: {}", errMsg);
            return std::nullopt;
        }

        if (json.contains("candidates") && json["candidates"].is_array() &&
            !json["candidates"].empty()) {
            auto& candidate = json["candidates"][0];
            if (candidate.contains("content") && candidate["content"].contains("parts") &&
                candidate["content"]["parts"].is_array() &&
                !candidate["content"]["parts"].empty()) {
                std::string content = candidate["content"]["parts"][0]["text"].get<std::string>();

                int totalTokens = 0;
                if (json.contains("usageMetadata")) {
                    totalTokens = json["usageMetadata"].value("totalTokenCount", 0);
                }
                LOG_INFO("Gemini inference completed in {:.0f}ms ({} tokens)",
                         latencyMs, totalTokens);
                return content;
            }
        }

        LOG_ERROR("Gemini response missing expected fields");
        return std::nullopt;

    } catch (const std::exception& e) {
        LOG_ERROR("Failed to parse Gemini response: {}", e.what());
        LOG_DEBUG("Raw response: {}", response.substr(0, 500));
        return std::nullopt;
    }
}

}  // namespace astrocore
