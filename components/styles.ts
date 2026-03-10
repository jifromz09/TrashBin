import {StyleSheet} from "react-native";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  image: {
    width: '100%',
    height: 250,
    marginVertical: 16,
    borderRadius: 8,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  labelText: {
    fontSize: 16,
  },
  confidence: {
    fontSize: 14,
    color: '#666',
  },
  classificationContainer: {
    marginTop: 20,
    padding: 20,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    alignItems: 'center',
  },
  classificationText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  inputContainer: {
    marginVertical: 10,
    paddingHorizontal: 16,
  },
  inputLabel: {
    fontSize: 14,
    marginBottom: 5,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  feedbackContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 15,
    gap: 10,
  },
  measurementContainer: {
    marginTop: 20,
    marginHorizontal: 16,
    padding: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 20,
  },
  measurementTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  metricSection: {
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  metricLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 5,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 5,
  },
  metricRating: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  metricSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
});

export default styles;
